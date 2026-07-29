<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\CreditNote;
use App\Models\SalesOrder;
use App\Models\SalesOrderAdjustment;
use App\Models\SalesOrderItem;
use App\Models\SalesRefund;
use App\Services\SalesLifecycleService;
use App\Services\SalesOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalesOrderController extends Controller
{
    public function index(Request $request, SalesOrderService $service): JsonResponse
    {
        $orders = SalesOrder::with(['customer','agent:id,first_name,last_name','invoice'])
            ->withCount('items')
            ->when($request->status, fn ($q,$status) => $q->where('status',$status))
            ->when($request->customer_id, fn ($q,$id) => $q->where('customer_id',$id))
            ->when($request->search, fn ($q,$search) => $q->where(function ($x) use ($search) {
                $x->where('order_number','like',"%{$search}%")->orWhereHas('customer', fn ($c) => $c->where('first_name','like',"%{$search}%")->orWhere('last_name','like',"%{$search}%"));
            }))
            ->latest()->paginate(min((int) $request->input('per_page',20),100));
        return response()->json(['success'=>true,'data'=>$orders]);
    }

    public function show(SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        return response()->json(['success'=>true,'data'=>$order->load($service->relations())]);
    }

    public function store(Request $request, SalesOrderService $service): JsonResponse
    {
        $data = $request->validate([
            'customer_id'=>'nullable|integer|exists:customers,id','customer_name'=>'nullable|required_without:customer_id|string|max:160',
            'customer_email'=>'nullable|email|max:255','customer_contact'=>'nullable|string|max:50','customer_address'=>'nullable|string|max:500',
            'notes'=>'nullable|string|max:5000',
        ]);
        $order = $service->createDraft($data, $request->user()->id);
        return response()->json(['success'=>true,'message'=>'Sales order draft created.','data'=>$order],201);
    }

    public function addItem(Request $request, SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        $data = $request->validate([
            'service_type'=>['required','string',Rule::in(array_keys(config('service_types')))],
            'service_id'=>'required|integer|exists:services,id','title'=>'nullable|string|max:255','description'=>'nullable|string|max:3000',
            'quantity'=>'nullable|numeric|min:0.01|max:10000','unit_price'=>'nullable|numeric|min:0|max:999999999','details'=>'required|array',
        ]);
        // Each engine performs explicit nested validation; this avoids Laravel dropping unlisted detail keys.
        $data['details'] = $request->input('details', []);
        $item = $service->addItem($order, $data, $request->user()->id);
        return response()->json(['success'=>true,'message'=>'Service added to order.','data'=>$item],201);
    }

    public function removeItem(Request $request, SalesOrder $order, SalesOrderItem $item, SalesOrderService $service): JsonResponse
    {
        $service->removeItem($order, $item, $request->user()->id);
        return response()->json(['success'=>true,'message'=>'Service removed from order.']);
    }

    public function quote(Request $request, SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        return response()->json(['success'=>true,'message'=>'Order marked as quoted.','data'=>$service->markQuoted($order,$request->user()->id)]);
    }

    public function confirm(Request $request, SalesOrder $order, SalesOrderService $service): JsonResponse
    {
        $data = $request->validate([
            'payment_method'=>['required',Rule::in(['Cash','GCash','Card'])],
            'payment_type'=>['required',Rule::in(['full','downpayment'])],
            'amount_received'=>'required|numeric|min:0','due_date'=>'nullable|date',
        ]);
        return response()->json(['success'=>true,'message'=>'Order confirmed and invoiced.','data'=>$service->confirm($order,$data,$request->user()->id)]);
    }

    public function requestAdjustment(Request $request, SalesOrder $order, SalesLifecycleService $service): JsonResponse
    {
        $data = $request->validate([
            'type'=>['required',Rule::in(['cancellation','amendment','rebooking'])],'reason'=>'required|string|max:3000','change_set'=>'nullable|array',
        ]);
        $adjustment = $service->request($order,$data['type'],$data['reason'],$request->input('change_set',[]),$request->user()->id);
        return response()->json(['success'=>true,'message'=>'Lifecycle request submitted for approval.','data'=>$adjustment],201);
    }

    public function approveAdjustment(Request $request, SalesOrderAdjustment $adjustment, SalesLifecycleService $service): JsonResponse
    {
        return response()->json(['success'=>true,'message'=>'Lifecycle request approved.','data'=>$service->approve($adjustment,$request->user()->id)]);
    }

    public function rejectAdjustment(Request $request, SalesOrderAdjustment $adjustment, SalesLifecycleService $service): JsonResponse
    {
        return response()->json(['success'=>true,'message'=>'Lifecycle request rejected.','data'=>$service->reject($adjustment,$request->user()->id)]);
    }

    public function requestRefund(Request $request, CreditNote $creditNote, SalesLifecycleService $service): JsonResponse
    {
        $data = $request->validate(['amount'=>'required|numeric|min:0.01','refund_method'=>'required|string|max:80','reason'=>'required|string|max:3000']);
        return response()->json(['success'=>true,'message'=>'Refund submitted for approval.','data'=>$service->requestRefund($creditNote,(float)$data['amount'],$data['refund_method'],$data['reason'],$request->user()->id)],201);
    }

    public function approveRefund(Request $request, SalesRefund $refund, SalesLifecycleService $service): JsonResponse
    {
        return response()->json(['success'=>true,'message'=>'Refund approved.','data'=>$service->approveRefund($refund,$request->user()->id)]);
    }

    public function processRefund(Request $request, SalesRefund $refund, SalesLifecycleService $service): JsonResponse
    {
        $data = $request->validate(['destination_reference'=>'nullable|string|max:255']);
        $processed = $service->processRefund($refund,$data['destination_reference'] ?? null,$request->user()->id);
        $message = $processed->status === 'processed'
            ? 'Refund processed and posted to the ledger.'
            : 'Refund submitted to PayMongo and is awaiting provider confirmation.';

        return response()->json(['success'=>true,'message'=>$message,'data'=>$processed]);
    }
}
