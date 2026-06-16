<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use Illuminate\Http\Request;

class JournalEntryController extends Controller
{
    public function index(Request $request)
    {
        $query = JournalEntry::with(['ledgerLines.account', 'reference']);

        // Search by reference or notes
        if ($request->has('search')) {
            $search = $request->query('search');
            $query->where(function($q) use ($search) {
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
            'data' => $query->latest('date')->latest('id')->paginate($request->query('per_page', 15))
        ]);
    }

    public function show($id)
    {
        $entry = JournalEntry::with(['ledgerLines.account', 'reference'])->findOrFail($id);
        return response()->json([
            'success' => true,
            'data' => $entry
        ]);
    }
}
