<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    public function index()
    {
        return JobApplication::latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'position_applied' => 'required|string',
            'status' => 'nullable|in:pending,interviewing,hired,rejected',
            'resume_url' => 'nullable|string',
            'cover_letter_url' => 'nullable|string',
            'notes' => 'nullable|string',
            'checklist' => 'nullable|array',
        ]);

        if (!isset($validated['checklist'])) {
            $validated['checklist'] = [
                'Resume/CV' => false,
                'Police Clearance/NBI' => false,
            ];
        }

        $application = JobApplication::create($validated);
        return response()->json($application, 201);
    }

    public function show(JobApplication $jobApplication)
    {
        return $jobApplication;
    }

    public function update(Request $request, JobApplication $jobApplication)
    {
        $validated = $request->validate([
            'first_name' => 'sometimes|string',
            'last_name' => 'sometimes|string',
            'email' => 'sometimes|email',
            'phone' => 'nullable|string',
            'position_applied' => 'sometimes|string',
            'status' => 'sometimes|in:pending,interviewing,hired,rejected',
            'resume_url' => 'nullable|string',
            'cover_letter_url' => 'nullable|string',
            'notes' => 'nullable|string',
            'checklist' => 'nullable|array',
        ]);

        $jobApplication->update($validated);
        return response()->json($jobApplication);
    }

    public function destroy(JobApplication $jobApplication)
    {
        $jobApplication->delete();
        return response()->noContent();
    }

    public function getDocuments(JobApplication $jobApplication)
    {
        $documents = \App\Models\JobApplicationDocument::with('uploader:id,first_name,last_name,email')
            ->where('job_application_id', $jobApplication->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => $documents,
        ]);
    }

    public function uploadDocument(Request $request, JobApplication $jobApplication)
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'file'  => ['required', 'file', 'max:10240'], // Max 10MB
        ]);

        $file = $request->file('file');
        $fileName = 'job_applications/' . $jobApplication->id . '/' . \Illuminate\Support\Str::random(20) . '.' . $file->getClientOriginalExtension();
        \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, file_get_contents($file));

        $document = \App\Models\JobApplicationDocument::create([
            'job_application_id' => $jobApplication->id,
            'title'            => $request->input('title'),
            'file_path'        => $fileName,
            'uploaded_by'      => auth()->id() ?? 1,
        ]);

        // Automatically check corresponding checklist item if match found
        $checklist = $jobApplication->checklist ?? [];
        $titleLower = strtolower(trim($request->input('title')));
        $updatedChecklist = [];
        foreach ($checklist as $key => $value) {
            if (strtolower(trim($key)) === $titleLower) {
                $updatedChecklist[$key] = true;
            } else {
                $updatedChecklist[$key] = $value;
            }
        }
        if (!empty($updatedChecklist)) {
            $jobApplication->update(['checklist' => $updatedChecklist]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded and linked successfully.',
            'data'    => $document->load('uploader:id,first_name,last_name,email'),
        ], 201);
    }

    public function deleteDocument(JobApplication $jobApplication, $documentId)
    {
        $document = \App\Models\JobApplicationDocument::where('id', $documentId)
            ->where('job_application_id', $jobApplication->id)
            ->first();

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found or does not belong to this application.',
            ], 404);
        }

        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($document->file_path)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($document->file_path);
        }

        $title = $document->title;
        $document->delete();

        // Automatically uncheck corresponding checklist item if match found
        $checklist = $jobApplication->checklist ?? [];
        $titleLower = strtolower(trim($title));
        $updatedChecklist = [];
        foreach ($checklist as $key => $value) {
            if (strtolower(trim($key)) === $titleLower) {
                $updatedChecklist[$key] = false;
            } else {
                $updatedChecklist[$key] = $value;
            }
        }
        if (!empty($updatedChecklist)) {
            $jobApplication->update(['checklist' => $updatedChecklist]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Document deleted successfully.',
        ]);
    }

    public function updateChecklist(Request $request, JobApplication $jobApplication)
    {
        $request->validate(['checklist' => ['required', 'array']]);

        $jobApplication->update(['checklist' => $request->checklist]);

        return response()->json([
            'success' => true,
            'data'    => $jobApplication->fresh(),
            'message' => 'Checklist updated.',
        ]);
    }

    public function convertToEmployee(Request $request, JobApplication $jobApplication)
    {
        // Must be hired first
        if ($jobApplication->status !== 'hired') {
            return response()->json([
                'success' => false,
                'message' => 'Only hired applicants can be converted to employees.',
            ], 422);
        }

        // Prevent duplicate conversion
        if ($jobApplication->converted_user_id) {
            return response()->json([
                'success' => false,
                'message' => 'This applicant has already been converted to an employee.',
            ], 422);
        }

        $validated = $request->validate([
            'employee_id'     => ['required', 'string', 'unique:users,employee_id'],
            'role'            => ['required', 'in:super_admin,executive_vice_president,driver,operations_manager,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics_in_charge,dispatcher,purchasing_manager,service_adviser,head_mechanic'],
            'department'      => ['required', 'string', 'max:100'],
            'send_invitation' => ['required', 'boolean'],
        ]);

        $sendInvitation = (bool) $validated['send_invitation'];
        $tempPassword = null;

        $userData = [
            'employee_id'          => $validated['employee_id'],
            'email'                => $jobApplication->email,
            'first_name'           => $jobApplication->first_name,
            'last_name'            => $jobApplication->last_name,
            'role'                 => $validated['role'],
            'department'           => $validated['department'],
            'is_active'            => true,
            'must_change_password' => true,
            'created_by'           => auth()->id(),
        ];

        if (!$sendInvitation) {
            $tempPassword = \Illuminate\Support\Str::random(16);
            $userData['password'] = \Illuminate\Support\Facades\Hash::make($tempPassword);
        }

        $user = \App\Models\User::create($userData);

        if ($sendInvitation) {
            $token = \Illuminate\Support\Facades\Password::broker()->createToken($user);
            $user->notify(new \App\Notifications\AccountInvitation($token, $user->email));
        } else {
            $user->notify(new \App\Notifications\TempPasswordNotification($tempPassword));
        }

        // Mark the job application as converted
        $jobApplication->update(['converted_user_id' => $user->id]);

        \App\Http\Services\AuditLogService::log(
            action: 'RECRUIT_APPLICANT_TO_EMPLOYEE',
            module: 'hr',
            entityType: 'user',
            entityId: $user->id,
            new: $user->toArray()
        );

        return response()->json([
            'success'            => true,
            'message'            => $sendInvitation
                ? 'Employee account created and invitation email sent to ' . $user->email
                : 'Employee account created. Provide the temporary password securely.',
            'data' => [
                'user'               => new \App\Http\Resources\UserResource($user),
                'temporary_password' => $tempPassword,
                'invitation_sent'    => $sendInvitation,
            ],
        ], 201);
    }
}
