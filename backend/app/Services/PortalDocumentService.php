<?php

namespace App\Services;

use App\Models\Accreditation;
use App\Models\CustomerPortalToken;
use App\Models\PassportCase;
use App\Models\PassportCaseDocument;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Consolidates the document-upload halves of PassportCaseController::uploadPublicDocument and
 * AccreditationController::uploadDocument behind one CustomerPortalToken-driven entry point.
 *
 * Per the plan: the underlying storage shapes (PassportCaseDocument rows vs Accreditation's
 * custom_documents JSON column) are NOT merged — each domain keeps its existing schema and
 * existing internal/staff-facing behavior. What's unified is token validation and the public
 * response contract (never expose a raw file URL on an unauthenticated read — C-04 convention).
 */
class PortalDocumentService
{
    /**
     * @param string $title For PassportCase tokens: the requested document title (free text,
     *                       matched case-insensitively against upload_requested_docs). For
     *                       Accreditation tokens: the document type/key (kyc|nda|terms|main|custom-key).
     * @return array{document: mixed, checklist_complete: bool}
     */
    public function storeUpload(CustomerPortalToken $token, UploadedFile $file, string $title): array
    {
        return match ($token->related_type) {
            'PassportCase' => $this->storePassportCaseUpload($token, $file, $title),
            'Accreditation' => $this->storeAccreditationUpload($token, $file, $title),
            default => throw new \InvalidArgumentException("Unsupported portal token related_type: {$token->related_type}"),
        };
    }

    private function storePassportCaseUpload(CustomerPortalToken $token, UploadedFile $file, string $title): array
    {
        /** @var PassportCase $case */
        $case = $token->related();

        $requested = array_map('strtolower', array_map('trim', $case->upload_requested_docs ?? []));
        $uploadTitle = trim($title);

        if (!in_array(strtolower($uploadTitle), $requested)) {
            throw new \InvalidArgumentException('Document title is not requested for online upload.');
        }

        $fileName = 'passport_cases/' . $case->id . '/' . Str::random(20) . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->put($fileName, file_get_contents($file));

        $document = PassportCaseDocument::create([
            'passport_case_id' => $case->id,
            'customer_id' => $case->customer_id,
            'title' => $uploadTitle,
            'file_path' => $fileName,
            'uploaded_by' => null, // Guest upload
        ]);

        $checklist = $case->checklist ?? [];
        $matchedKey = null;
        foreach (array_keys($checklist) as $key) {
            if (strtolower(trim($key)) === strtolower($uploadTitle)) {
                $matchedKey = $key;
                break;
            }
        }
        $checklist[$matchedKey ?? $uploadTitle] = true;
        $case->update(['checklist' => $checklist]);

        \App\Services\NotificationService::notifyCustomerDocumentUpload($case, $uploadTitle);
        \App\Services\AuditLogService::log(
            'customer_document_upload', 'Travel', 'PassportCase', $case->id,
            null, ['title' => $uploadTitle, 'file_path' => $fileName]
        );

        return ['document' => $document, 'checklist_complete' => $this->isChecklistComplete($token)];
    }

    private function storeAccreditationUpload(CustomerPortalToken $token, UploadedFile $file, string $type): array
    {
        /** @var Accreditation $accreditation */
        $accreditation = $token->related();

        $customDocs = $accreditation->custom_documents ?? [];
        $customKeys = array_column($customDocs, 'key');
        $validTypes = array_merge(['kyc', 'nda', 'terms', 'main'], $customKeys);

        if (!in_array($type, $validTypes)) {
            throw new \InvalidArgumentException('Invalid document type.');
        }

        $filename = time() . '_' . $file->getClientOriginalName();
        $path = $file->storeAs("accreditations/{$accreditation->id}/{$type}", $filename, 'public');
        $url = Storage::disk('public')->url($path);

        if ($type === 'main') {
            $accreditation->document_url = $url;
        } else {
            foreach ($customDocs as &$doc) {
                if ($doc['key'] === $type) {
                    $doc['url'] = $url;
                    $doc['status'] = 'submitted';
                    break;
                }
            }
            unset($doc);
            $accreditation->custom_documents = $customDocs;

            if (in_array($type, ['kyc', 'nda', 'terms'])) {
                $column = "{$type}_document_url";
                $accreditation->{$column} = $url;
            }
        }
        $accreditation->save();

        return ['document' => ['type' => $type], 'checklist_complete' => $this->isChecklistComplete($token)];
    }

    public function checklistProgress(CustomerPortalToken $token): array
    {
        if ($token->related_type === 'PassportCase') {
            /** @var PassportCase $case */
            $case = $token->related();
            $requested = $case->upload_requested_docs ?? [];
            $uploadedTitles = PassportCaseDocument::where('passport_case_id', $case->id)
                ->pluck('title')->map(fn ($t) => trim(strtolower($t)))->toArray();
            $uploadedCount = count(array_filter($requested, fn ($r) => in_array(strtolower(trim($r)), $uploadedTitles)));
            $total = max(count($requested), 1);

            return [
                'requested' => $requested,
                'uploaded' => $uploadedTitles,
                'percent_complete' => (int) round(($uploadedCount / $total) * 100),
            ];
        }

        if ($token->related_type === 'Accreditation') {
            /** @var Accreditation $accreditation */
            $accreditation = $token->related();
            $customDocs = $accreditation->custom_documents ?? [];
            $total = max(count($customDocs), 1);
            $submitted = count(array_filter($customDocs, fn ($d) => !empty($d['url'])));

            return [
                'requested' => array_column($customDocs, 'name'),
                'uploaded' => array_column(array_filter($customDocs, fn ($d) => !empty($d['url'])), 'name'),
                'percent_complete' => (int) round(($submitted / $total) * 100),
            ];
        }

        return ['requested' => [], 'uploaded' => [], 'percent_complete' => 0];
    }

    public function isChecklistComplete(CustomerPortalToken $token): bool
    {
        return $this->checklistProgress($token)['percent_complete'] >= 100;
    }
}
