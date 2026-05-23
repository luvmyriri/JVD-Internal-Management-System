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
        ]);

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
        ]);

        $jobApplication->update($validated);
        return response()->json($jobApplication);
    }

    public function destroy(JobApplication $jobApplication)
    {
        $jobApplication->delete();
        return response()->noContent();
    }
}
