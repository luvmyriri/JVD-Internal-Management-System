<?php

namespace Tests\Feature;

use App\Http\Resources\InvoiceResource;
use App\Models\Contract;
use App\Models\CustomerPortalToken;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\JoinerDeparture;
use App\Models\JoinerDepartureSeat;
use App\Models\JoinerPassenger;
use App\Models\JoinerReservation;
use App\Models\Service;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerPortalInvoiceSummaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_contract_portal_and_documents_include_every_line_and_named_joiner_seat(): void
    {
        $user = User::factory()->superAdmin()->create();
        $service = Service::create([
            'name' => 'Sagada September Joiner',
            'description' => 'Fixed four-day joiner departure.',
            'category' => 'Joiners',
            'service_type' => 'joiner_tour',
            'price' => 4500,
            'adult_price' => 4500,
            'child_price' => 3000,
            'is_active' => true,
            'created_by' => $user->id,
        ]);
        $departure = JoinerDeparture::create([
            'service_id' => $service->id,
            'code' => 'SGD-2026-09-15',
            'starts_at' => '2026-09-15 05:00:00',
            'ends_at' => '2026-09-18 22:00:00',
            'booking_cutoff_at' => '2026-09-14 17:00:00',
            'capacity' => 20,
            'confirmed_count' => 2,
            'pickup_instructions' => 'JVD office by 4:30 AM.',
            'status' => 'published',
            'created_by' => $user->id,
        ]);
        $invoice = Invoice::create([
            'invoice_number' => 'INV-PORTAL-LINES',
            'customer_name' => 'Customer One',
            'customer_email' => 'customer.one@example.test',
            'customer_contact' => '09171234567',
            'subtotal' => 8500,
            'tax_amount' => 1020,
            'total_amount' => 9520,
            'amount_received' => 9520,
            'change' => 0,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'balance' => 0,
            'status' => 'paid',
            'created_by' => $user->id,
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'service_id' => $service->id,
            'item_name' => 'Sagada September Joiner',
            'service_type' => 'joiner_tour',
            'item_description' => 'Fixed Sep 15 to 18 departure.',
            'quantity' => 2,
            'unit_price' => 3750,
            'total_price' => 7500,
            'adults' => 1,
            'children' => 1,
            'adult_price' => 4500,
            'child_price' => 3000,
        ]);
        InvoiceItem::create([
            'invoice_id' => $invoice->id,
            'item_name' => 'Travel Insurance',
            'service_type' => 'insurance',
            'item_description' => 'Domestic travel protection.',
            'quantity' => 2,
            'unit_price' => 500,
            'total_price' => 1000,
        ]);

        $reservation = JoinerReservation::create([
            'departure_id' => $departure->id,
            'invoice_id' => $invoice->id,
            'reference' => '8a49e670-d104-491b-9a8b-5470dd220001',
            'lead_name' => 'Customer One',
            'lead_email' => 'customer.one@example.test',
            'passenger_count' => 2,
            'status' => 'confirmed',
            'created_by' => $user->id,
        ]);
        $adultSeat = JoinerDepartureSeat::create([
            'departure_id' => $departure->id,
            'reservation_id' => $reservation->id,
            'seat_code' => 'A1',
            'status' => 'confirmed',
        ]);
        $childSeat = JoinerDepartureSeat::create([
            'departure_id' => $departure->id,
            'reservation_id' => $reservation->id,
            'seat_code' => 'A2',
            'status' => 'confirmed',
        ]);
        JoinerPassenger::create([
            'reservation_id' => $reservation->id,
            'departure_seat_id' => $adultSeat->id,
            'first_name' => 'Customer',
            'last_name' => 'One',
            'passenger_type' => 'adult',
        ]);
        JoinerPassenger::create([
            'reservation_id' => $reservation->id,
            'departure_seat_id' => $childSeat->id,
            'first_name' => 'Child',
            'last_name' => 'One',
            'passenger_type' => 'child',
        ]);

        $contract = Contract::create([
            'invoice_id' => $invoice->id,
            'contract_number' => 'CTR-PORTAL-LINES',
            'status' => 'sent_for_signature',
            'terms_snapshot' => 'Customer accepts the fixed departure schedule and assigned seats.',
            'created_by' => $user->id,
        ]);
        $token = CustomerPortalToken::generateFor('Contract', $contract->id, 'contract_signature');

        $this->getJson("/api/v1/public/portal/{$token->token}")
            ->assertOk()
            ->assertJsonPath('data.invoice_summary.items.0.name', 'Sagada September Joiner')
            ->assertJsonPath('data.invoice_summary.items.1.name', 'Travel Insurance')
            ->assertJsonPath('data.invoice_summary.joiner_booking.departure_code', 'SGD-2026-09-15')
            ->assertJsonPath('data.invoice_summary.joiner_booking.passengers.0.seat_code', 'A1')
            ->assertJsonPath('data.invoice_summary.joiner_booking.passengers.0.name', 'Customer One')
            ->assertJsonPath('data.invoice_summary.joiner_booking.passengers.1.seat_code', 'A2')
            ->assertJsonPath('data.invoice_summary.joiner_booking.passengers.1.passenger_type', 'child');

        $loadedInvoice = $invoice->fresh()->load([
            'items.service',
            'joinerReservation.departure',
            'joinerReservation.passengers.seat',
        ]);
        $resource = (new InvoiceResource($loadedInvoice))->resolve();
        $this->assertSame('A1', $resource['joiner_reservation']['passengers'][0]['seat_code']);
        $this->assertSame('Customer One', $resource['joiner_reservation']['passengers'][0]['name']);
        $this->assertSame('Travel Insurance', $resource['items'][1]['service_name']);

        $viewData = [
            'invoice' => $loadedInvoice,
            'company' => [
                'name' => 'JVD Event & Travel Management Company',
                'address' => 'Caloocan City',
                'phone' => '09764711294',
                'email' => 'accounts@example.test',
                'registration' => '912-883-911-000',
            ],
            'generatedAt' => now(),
            'taxRate' => 0.12,
        ];
        $receiptHtml = view('pdf.payment-receipt', $viewData)->render();
        $invoiceHtml = view('pdf.invoice', $viewData)->render();

        $this->assertStringContainsString('Sagada September Joiner', $receiptHtml);
        $this->assertStringContainsString('Travel Insurance', $receiptHtml);
        $this->assertStringContainsString('A1 - Customer One', $receiptHtml);
        $this->assertStringContainsString('A2 - Child One (Child)', $receiptHtml);
        $this->assertStringContainsString('Fixed Sep 15 to 18 departure.', $invoiceHtml);
        $this->assertStringContainsString('A1 - Customer One', $invoiceHtml);
    }
}
