<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\JobApplication;
use App\Models\JobApplicationDocument;
use App\Models\User;
use App\Notifications\AccountInvitation;
use App\Services\AuditLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

        if (! isset($validated['checklist'])) {
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
        $documents = JobApplicationDocument::with('uploader:id,first_name,last_name,email')
            ->where('job_application_id', $jobApplication->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $documents,
        ]);
    }

    public function uploadDocument(Request $request, JobApplication $jobApplication)
    {
        $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'mimes:pdf,jpeg,jpg,png,doc,docx', 'max:10240'], // Max 10MB
        ]);

        $file = $request->file('file');
        $extension = strtolower($file->extension() ?: $file->getClientOriginalExtension());
        if (! in_array($extension, ['pdf', 'jpeg', 'jpg', 'png', 'doc', 'docx'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid file extension resolved.',
            ], 422);
        }
        $fileName = 'job_applications/'.$jobApplication->id.'/'.Str::random(20).'.'.$extension;
        Storage::disk('public')->put($fileName, file_get_contents($file));

        $document = JobApplicationDocument::create([
            'job_application_id' => $jobApplication->id,
            'title' => $request->input('title'),
            'file_path' => $fileName,
            'uploaded_by' => auth()->id() ?? 1,
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
        if (! empty($updatedChecklist)) {
            $jobApplication->update(['checklist' => $updatedChecklist]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded and linked successfully.',
            'data' => $document->load('uploader:id,first_name,last_name,email'),
        ], 201);
    }

    public function deleteDocument(JobApplication $jobApplication, $documentId)
    {
        $document = JobApplicationDocument::where('id', $documentId)
            ->where('job_application_id', $jobApplication->id)
            ->first();

        if (! $document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found or does not belong to this application.',
            ], 404);
        }

        if (Storage::disk('public')->exists($document->file_path)) {
            Storage::disk('public')->delete($document->file_path);
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
        if (! empty($updatedChecklist)) {
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
            'data' => $jobApplication->fresh(),
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
            'employee_id' => ['nullable', 'string', 'unique:users,employee_id'],
            'role' => ['required', 'in:super_admin,executive_vice_president,driver,operations_manager,reservation_officer,office_staff,accounting_executive,corporate_secretary,logistics_in_charge,dispatcher,purchasing_manager,service_adviser,head_mechanic'],
            'department' => ['required', 'string', 'max:100'],
            'send_invitation' => ['required', 'boolean'],
        ]);

        if (! $request->user()->can('createWithRole', [User::class, $validated['role']])) {
            abort(403, 'You are not authorized to provision an account with this role.');
        }

        // Check if email already exists in users table (H-01)
        if (User::where('email', $jobApplication->email)->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'An employee account with this email ('.$jobApplication->email.') already exists.',
            ], 422);
        }

        $employeeId = $validated['employee_id'] ?? $request->input('employee_id');
        if (! $employeeId) {
            $latest = User::withTrashed()->orderBy('id', 'desc')->first();
            $nextId = $latest ? ($latest->id + 1001) : 1001;
            $employeeId = 'JVD-EMP-'.$nextId;
        }

        $userData = [
            'employee_id' => $employeeId,
            'email' => $jobApplication->email,
            'first_name' => $jobApplication->first_name,
            'last_name' => $jobApplication->last_name,
            'role' => $validated['role'],
            'department' => $validated['department'],
            'is_active' => true,
            // Login remains impossible until the employee follows the signed
            // password-setup link. This placeholder is never disclosed.
            'password' => Hash::make(Str::random(64)),
            'must_change_password' => true,
            'created_by' => auth()->id(),
        ];

        // Wrap db and notification dispatching in transaction (H-02)
        DB::beginTransaction();
        try {
            $user = User::create($userData);

            $token = Password::broker()->createToken($user);

            // Mark the job application as converted
            $jobApplication->update(['converted_user_id' => $user->id]);

            AuditLogService::log(
                action: 'RECRUIT_APPLICANT_TO_EMPLOYEE',
                module: 'hr',
                entityType: 'user',
                entityId: $user->id,
                new: $user->toArray()
            );

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'success' => false,
                'message' => 'Failed to convert applicant to employee: '.$e->getMessage(),
            ], 500);
        }

        // AccountInvitation is queued. Dispatch only after the user, reset
        // token, application conversion, and audit record are committed so a
        // fast worker can never observe a half-created employee account.
        $user->notify(new AccountInvitation($token, $user->email));

        return response()->json([
            'success' => true,
            'message' => 'Employee account created and a secure password-setup link was sent to '.$user->email,
            'data' => [
                'user' => new UserResource($user),
                'invitation_sent' => true,
                'setup_required' => true,
            ],
        ], 201);
    }
}
