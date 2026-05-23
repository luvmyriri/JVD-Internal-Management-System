<?php

namespace App\Http\Controllers;

use App\Models\Internship;
use Illuminate\Http\Request;

class InternshipController extends Controller
{
    public function index()
    {
        return Internship::latest()->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string',
            'last_name' => 'required|string',
            'email' => 'required|email',
            'phone' => 'nullable|string',
            'school' => 'required|string',
            'course' => 'required|string',
            'hours_required' => 'required|integer',
            'status' => 'nullable|in:pending,active,completed,rejected',
            'documents_url' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $internship = Internship::create($validated);
        return response()->json($internship, 201);
    }

    public function show(Internship $internship)
    {
        return $internship;
    }

    public function update(Request $request, Internship $internship)
    {
        $validated = $request->validate([
            'first_name' => 'sometimes|string',
            'last_name' => 'sometimes|string',
            'email' => 'sometimes|email',
            'phone' => 'nullable|string',
            'school' => 'sometimes|string',
            'course' => 'sometimes|string',
            'hours_required' => 'sometimes|integer',
            'status' => 'sometimes|in:pending,active,completed,rejected',
            'documents_url' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $internship->update($validated);
        return response()->json($internship);
    }

    public function destroy(Internship $internship)
    {
        $internship->delete();
        return response()->noContent();
    }
}
