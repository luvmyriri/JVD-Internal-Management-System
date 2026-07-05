<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\CashBudgetRequestService;
use App\Models\CashBudgetRequest;
use App\Models\User;
use App\Notifications\SystemAlert;
use App\Notifications\ActionableApprovalNotification;
use Illuminate\Http\Request;

class CashBudgetRequestController extends Controller
{
    private CashBudgetRequestService $service;

    public function __construct(CashBudgetRequestService $service)
    {
        $this->service = $service;
    }

    public function index(Request $request)
    {
        return $this->service->index($request);
    }

    public function store(Request $request)
    {
        return $this->service->store($request);
    }

    public function show($id)
    {
        return $this->service->show($id);
    }

    public function update(Request $request, $id)
    {
        return $this->service->update($request, $id);
    }

    public function destroy($id)
    {
        return $this->service->destroy($id);
    }
}