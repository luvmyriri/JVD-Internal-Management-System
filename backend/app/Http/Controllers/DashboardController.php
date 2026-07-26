<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use Illuminate\Http\Request;

/**
 * Thin HTTP adapter over DashboardService (roadmap 2.9). All aggregation logic lives in
 * the service; these methods only resolve the caller and wrap the JSON envelope.
 */
class DashboardController extends Controller
{
    public function __construct(private DashboardService $dashboard)
    {
    }

    public function admin(Request $request)
    {
        return response()->json(['success' => true, 'data' => $this->dashboard->adminData()]);
    }

    public function accounting(Request $request)
    {
        return response()->json(['success' => true, 'data' => $this->dashboard->accountingData()]);
    }

    public function agent(Request $request)
    {
        return response()->json(['success' => true, 'data' => $this->dashboard->agentData($request->user())]);
    }

    public function driver(Request $request)
    {
        return response()->json(['success' => true, 'data' => $this->dashboard->driverData($request->user())]);
    }

    public function hr(Request $request)
    {
        return response()->json(['success' => true, 'data' => $this->dashboard->hrData()]);
    }

    public function approvals()
    {
        return response()->json($this->dashboard->approvalsData());
    }

    public function widgetApprovals(Request $request)
    {
        return response()->json($this->dashboard->widgetApprovalsData($request->user()));
    }

    public function widgetTasks(Request $request)
    {
        return response()->json($this->dashboard->widgetTasksData($request->user()));
    }

    public function widgetRevenue(Request $request)
    {
        return response()->json($this->dashboard->widgetRevenueData());
    }

    public function widgetFleet(Request $request)
    {
        return response()->json($this->dashboard->widgetFleetData());
    }
}
