<?php

namespace App\Http\Controllers\Travel;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\AgentTask;
use Illuminate\Http\Request;

class AgentTaskController extends Controller
{
    public function index(Customer $customer)
    {
        return response()->json($customer->tasks()->with('assignee')->latest()->get());
    }

    public function store(\App\Http\Requests\Travel\StoreAgentTaskRequest $request, Customer $customer)
    {
        $validated = $request->validated();

        if (!isset($validated['assigned_to'])) {
            $validated['assigned_to'] = $request->user()->id;
        }

        $task = $customer->tasks()->create($validated);

        \App\Services\NotificationService::notifyTaskAssignment($task);

        return response()->json($task->load('assignee'), 201);
    }

    public function update(\App\Http\Requests\Travel\UpdateAgentTaskRequest $request, Customer $customer, AgentTask $task)
    {
        if ($task->customer_id !== $customer->id) {
            abort(404);
        }

        $validated = $request->validated();

        $oldAssignedTo = $task->assigned_to;
        $task->update($validated);

        if (isset($validated['assigned_to']) && $validated['assigned_to'] != $oldAssignedTo) {
            \App\Services\NotificationService::notifyTaskAssignment($task);
        }

        return response()->json($task->load('assignee'));
    }

    public function destroy(Customer $customer, AgentTask $task)
    {
        if ($task->customer_id !== $customer->id) {
            abort(404);
        }
        
        $task->delete();
        return response()->json(null, 204);
    }
}
