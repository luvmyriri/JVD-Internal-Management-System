<?php

namespace App\Http\Controllers\Procurement;

use App\Http\Controllers\Controller;
use App\Services\ProcurementDocumentService;
use Illuminate\Http\Request;

/**
 * Thin HTTP adapter over ProcurementDocumentService (roadmap 2.9). The service already
 * existed as a byte-identical copy of this controller but was never wired up (dead code);
 * the controller now delegates to it, which both thins the controller and removes the
 * duplication. Behaviour is unchanged — see ProcurementDocumentListTest.
 *
 * (Follow-on: the service still returns JSON responses; it can later be refactored to
 * return data with the HTTP envelope moving back here.)
 */
class ProcurementDocumentController extends Controller
{
    public function __construct(private ProcurementDocumentService $service)
    {
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
