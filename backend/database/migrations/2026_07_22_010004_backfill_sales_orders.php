<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $categoryMap = [
            'bus rental'=>'bus_rental','bus & van rental'=>'bus_rental','private tour'=>'private_tour','tour package'=>'private_tour',
            'joiners'=>'joiner_tour','joiner'=>'joiner_tour','educational tour'=>'educational_tour','visa processing'=>'visa_assistance',
            'passport'=>'passport_assistance','flight'=>'flight_booking','hotel'=>'accommodation_booking','accommodation'=>'accommodation_booking',
            'ticket'=>'ticket_booking','activity'=>'activity_booking','transfer'=>'transfer_service','custom'=>'custom_arrangement',
        ];

        foreach (DB::table('invoices')->orderBy('id')->get() as $invoice) {
            if (DB::table('sales_orders')->where('invoice_id', $invoice->id)->exists()) continue;

            $orderId = DB::table('sales_orders')->insertGetId([
                'order_number' => sprintf('ORD-%s-%06d', substr((string) ($invoice->created_at ?? now()), 0, 4), $invoice->id),
                'customer_id' => $invoice->customer_id, 'invoice_id' => $invoice->id, 'agent_id' => $invoice->created_by,
                'status' => $this->orderStatus($invoice->status), 'currency' => 'PHP', 'subtotal' => $invoice->subtotal,
                'tax_amount' => $invoice->tax_amount, 'total_amount' => $invoice->total_amount,
                'amount_paid' => max(0, (float) $invoice->total_amount - (float) ($invoice->balance ?? 0)),
                'balance' => $invoice->balance ?? $invoice->total_amount, 'version' => 1,
                'metadata' => json_encode(['source' => 'historical_invoice_backfill']),
                'created_at' => $invoice->created_at ?? now(), 'updated_at' => $invoice->updated_at ?? now(),
            ]);

            $fulfillment = $this->fulfillmentFor((int) $invoice->id);
            $line = 0;
            foreach (DB::table('invoice_items')->where('invoice_id', $invoice->id)->orderBy('id')->get() as $invoiceItem) {
                $line++;
                $service = DB::table('services')->where('id', $invoiceItem->service_id)->first();
                $type = $fulfillment['type_code'] ?? $service?->service_type ?? $categoryMap[strtolower((string) ($service?->category ?? ''))] ?? 'custom_arrangement';
                DB::table('sales_order_items')->insert([
                    'sales_order_id'=>$orderId,'line_number'=>$line,'service_type'=>$type,'service_id'=>$invoiceItem->service_id,
                    'fulfillment_type'=>$line === 1 ? ($fulfillment['class'] ?? null) : null,
                    'fulfillment_id'=>$line === 1 ? ($fulfillment['id'] ?? null) : null,
                    'status'=>$invoice->status === 'cancelled' ? 'cancelled' : 'confirmed',
                    'title'=>$service?->name ?? 'Service','description'=>$service?->description,
                    'quantity'=>$invoiceItem->quantity,'unit_price'=>$invoiceItem->unit_price,'subtotal'=>$invoiceItem->total_price,
                    'tax_amount'=>0,'total_amount'=>$invoiceItem->total_price,'created_at'=>$invoiceItem->created_at ?? now(),'updated_at'=>$invoiceItem->updated_at ?? now(),
                ]);
            }
            DB::table('sales_order_events')->insert([
                'sales_order_id'=>$orderId,'event_type'=>'historical_order_imported','to_status'=>$this->orderStatus($invoice->status),
                'payload'=>json_encode(['invoice_id'=>$invoice->id]),'actor_id'=>$invoice->created_by,'occurred_at'=>$invoice->created_at ?? now(),
            ]);
        }
    }

    private function fulfillmentFor(int $invoiceId): array
    {
        foreach ([
            ['joiner_reservations', \App\Models\JoinerReservation::class, 'joiner_tour'],
            ['charter_bookings', \App\Models\CharterBooking::class, 'bus_rental'],
            ['educational_tour_bookings', \App\Models\EducationalTourBooking::class, 'educational_tour'],
        ] as [$table, $class, $code]) {
            $record = DB::table($table)->where('invoice_id', $invoiceId)->first();
            if ($record) return ['class'=>$class, 'id'=>$record->id, 'type_code'=>$code];
        }
        return [];
    }

    private function orderStatus(?string $invoiceStatus): string
    {
        return match ($invoiceStatus) {
            'cancelled' => 'cancelled', 'paid', 'partial' => 'confirmed',
            'draft_pending_contract' => 'draft', default => 'awaiting_payment',
        };
    }

    public function down(): void
    {
        DB::table('sales_order_events')->where('event_type', 'historical_order_imported')->delete();
        DB::table('sales_orders')->where('metadata', 'like', '%historical_invoice_backfill%')->delete();
    }
};
