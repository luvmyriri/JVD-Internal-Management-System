<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\TripTicketService;
use App\Models\TripTicket;
use App\Models\Bus;
use Illuminate\Http\Request;

class TripTicketController extends Controller
{
    private TripTicketService $service;

    public function __construct(TripTicketService $service)
    {
        $this->service = $service;
    }

    public function index()
    {
        return $this->service->index();
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

    public function checkConflict(Request $request)
    {
        return $this->service->checkConflict($request);
    }

    public function autoGeneratePreTripWorkOrder(TripTicket $ticket)
    {
        return $this->service->autoGeneratePreTripWorkOrder($ticket);
    }
}