<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class JournalEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = JournalEntry::with(['ledgerLines.account', 'reference']);

        // Search by reference or notes
        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('notes', 'like', "%{$search}%")
                  ->orWhere('status', 'like', "%{$search}%");
            });
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('date', [$request->query('start_date'), $request->query('end_date')]);
        }

        return response()->json([
            'success' => true,
            'data' => $query->latest('date')->latest('id')->paginate($request->query('per_page', 15)),
        ]);
    }

    public function show($id)
    {
        $entry = JournalEntry::with(['ledgerLines.account', 'reference'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $entry,
        ]);
    }

    /**
     * Post a manual journal entry.
     *
     * Manual entries carry no polymorphic reference (reference_type IS NULL),
     * which is how they are distinguished from entries auto-posted by the
     * sales/payroll/liquidation subsystems. Balancing (debits == credits),
     * the >= 2 line rule, and non-negative amounts are all enforced by
     * LedgerService::recordEntry(), so this method never posts an invalid entry.
     */
    public function store(Request $request, LedgerService $ledger)
    {
        $validated = $request->validate([
            'date'                => ['required', 'date'],
            'notes'               => ['required', 'string', 'max:255'],
            'lines'               => ['required', 'array', 'min:2'],
            'lines.*.account_id'  => ['required', 'integer', 'exists:accounts,id'],
            'lines.*.debit'       => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit'      => ['nullable', 'numeric', 'min:0'],
            'lines.*.description' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $entry = $ledger->recordEntry(
                $validated['date'],
                $validated['notes'],
                array_map(fn ($line) => [
                    'account_id'  => $line['account_id'],
                    'debit'       => round((float) ($line['debit'] ?? 0), 2),
                    'credit'      => round((float) ($line['credit'] ?? 0), 2),
                    'description' => $line['description'] ?? null,
                ], $validated['lines']),
            );
        } catch (\Throwable $e) {
            // LedgerService throws on unbalanced/empty/invalid entries -> surface as 422.
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'Journal entry posted.',
            'data'    => $entry->load('ledgerLines.account'),
        ], 201);
    }

    /**
     * Bulk-import journal entries from a CSV file.
     *
     * Expected columns (header row required, case-insensitive):
     *   entry_ref, date, notes, account_code, debit, credit, description
     *
     * Rows sharing the same entry_ref are grouped into one balanced journal
     * entry. `date`/`notes` are taken from the first row of each group.
     * `account_code` is matched against the chart of accounts (e.g. 1000).
     * Each entry posts independently and atomically via LedgerService; the
     * response reports exactly which entry_refs posted and which were rejected,
     * so a partially-valid file loads its good rows and itemises the rest.
     */
    public function import(Request $request, LedgerService $ledger)
    {
        $request->validate([
            'file' => ['required', 'file', 'max:5120'], // 5 MB
        ]);

        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension());
        if (! in_array($ext, ['csv', 'txt'], true)) {
            throw ValidationException::withMessages([
                'file' => 'Please upload a .csv file.',
            ]);
        }

        $rows = $this->parseCsv($file->getRealPath());
        if (empty($rows)) {
            throw ValidationException::withMessages([
                'file' => 'The file has a header but no data rows.',
            ]);
        }

        // Resolve account codes once.
        $accountsByCode = Account::query()->pluck('id', 'code');

        // Group data rows by entry_ref (preserving first-seen order).
        $groups = [];
        foreach ($rows as $i => $row) {
            $ref = trim((string) ($row['entry_ref'] ?? ''));
            if ($ref === '') {
                $ref = 'ROW-' . ($i + 2); // fallback: treat a ref-less row as its own entry
            }
            $groups[$ref][] = $row;
        }

        $posted = [];
        $failed = [];

        foreach ($groups as $ref => $groupRows) {
            $first = $groupRows[0];
            $date = trim((string) ($first['date'] ?? ''));
            $notes = trim((string) ($first['notes'] ?? '')) ?: "Imported entry {$ref}";

            if ($date === '' || strtotime($date) === false) {
                $failed[] = ['entry_ref' => $ref, 'error' => 'Missing or invalid date.'];
                continue;
            }

            $lines = [];
            $lineError = null;
            foreach ($groupRows as $row) {
                $code = trim((string) ($row['account_code'] ?? ''));
                if ($code === '' || ! isset($accountsByCode[$code])) {
                    $lineError = "Unknown account_code '{$code}'.";
                    break;
                }
                $lines[] = [
                    'account_id'  => $accountsByCode[$code],
                    'debit'       => round((float) ($row['debit'] ?? 0), 2),
                    'credit'      => round((float) ($row['credit'] ?? 0), 2),
                    'description' => trim((string) ($row['description'] ?? '')) ?: null,
                ];
            }

            if ($lineError) {
                $failed[] = ['entry_ref' => $ref, 'error' => $lineError];
                continue;
            }

            try {
                $entry = $ledger->recordEntry(date('Y-m-d', strtotime($date)), $notes, $lines);
                $posted[] = ['entry_ref' => $ref, 'id' => $entry->id];
            } catch (\Throwable $e) {
                $failed[] = ['entry_ref' => $ref, 'error' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => count($failed) === 0,
            'message' => sprintf('%d entr%s posted, %d rejected.', count($posted), count($posted) === 1 ? 'y' : 'ies', count($failed)),
            'data'    => [
                'posted_count' => count($posted),
                'failed_count' => count($failed),
                'posted'       => $posted,
                'failed'       => $failed,
            ],
        ], count($failed) === 0 ? 201 : 207);
    }

    /**
     * Parse a CSV file into an array of associative rows keyed by lower-cased,
     * trimmed header names. Strips a UTF-8 BOM if present.
     */
    private function parseCsv(string $path): array
    {
        $handle = fopen($path, 'r');
        if ($handle === false) {
            return [];
        }

        $header = null;
        $rows = [];
        while (($data = fgetcsv($handle)) !== false) {
            // Skip fully-empty lines.
            if ($data === [null] || (count($data) === 1 && trim((string) $data[0]) === '')) {
                continue;
            }

            if ($header === null) {
                $header = array_map(function ($h) {
                    return strtolower(trim(str_replace("\xEF\xBB\xBF", '', (string) $h)));
                }, $data);
                continue;
            }

            $row = [];
            foreach ($header as $col => $name) {
                $row[$name] = $data[$col] ?? null;
            }
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }
}
