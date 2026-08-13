<?php

namespace Tests\Feature;

use App\Mail\GeneratedContractMail;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class OptionalContractGenerationTest extends TestCase
{
    use RefreshDatabase;

    public function test_paid_invoice_can_generate_and_email_a_contract_without_signature_gate(): void
    {
        Mail::fake();
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-OPTIONAL-CONTRACT',
            'customer_name' => 'Maria Santos',
            'customer_email' => 'maria@example.com',
            'subtotal' => 10000,
            'tax_amount' => 1200,
            'total_amount' => 11200,
            'amount_received' => 11200,
            'balance' => 0,
            'payment_method' => 'Cash',
            'payment_type' => 'full',
            'status' => 'paid',
            'created_by' => $user->id,
        ]);
        $invoice->items()->create([
            'item_name' => 'Private Tour',
            'service_type' => 'private_tour',
            'quantity' => 1,
            'unit_price' => 10000,
            'total_price' => 10000,
        ]);

        $response = $this->actingAs($user)
            ->postJson("/api/v1/invoices/{$invoice->id}/contract", ['send_email' => true])
            ->assertCreated()
            ->assertJsonPath('data.contract.status', 'issued')
            ->assertJsonPath('data.email_sent', true)
            ->assertJsonPath('data.email', 'maria@example.com');

        $contractId = $response->json('data.contract.id');
        $this->assertDatabaseHas('contracts', [
            'id' => $contractId,
            'invoice_id' => $invoice->id,
            'status' => 'issued',
            'signed_at' => null,
        ]);
        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'status' => 'paid',
            'requires_contract' => true,
            'contract_gate_status' => 'generated',
        ]);
        Mail::assertQueued(GeneratedContractMail::class, fn (GeneratedContractMail $mail) => $mail->contract->id === $contractId);
        $this->actingAs($user)->get("/api/v1/contracts/{$contractId}/pdf")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_contract_generation_is_idempotent_and_does_not_require_customer_email(): void
    {
        Mail::fake();
        $user = User::factory()->superAdmin()->create();
        $invoice = Invoice::create([
            'invoice_number' => 'INV-CONTRACT-NO-EMAIL',
            'customer_name' => 'Walk-in Customer',
            'subtotal' => 5000,
            'tax_amount' => 0,
            'total_amount' => 5000,
            'amount_received' => 1000,
            'balance' => 4000,
            'payment_method' => 'Cash',
            'payment_type' => 'downpayment',
            'status' => 'partial',
            'created_by' => $user->id,
        ]);

        $firstId = $this->actingAs($user)
            ->postJson("/api/v1/invoices/{$invoice->id}/contract", ['send_email' => true])
            ->assertCreated()
            ->assertJsonPath('data.email_sent', false)
            ->json('data.contract.id');

        $this->actingAs($user)
            ->postJson("/api/v1/invoices/{$invoice->id}/contract", ['send_email' => false])
            ->assertOk()
            ->assertJsonPath('data.contract.id', $firstId);

        $this->assertSame(1, Contract::where('invoice_id', $invoice->id)->count());
        $this->assertSame('partial', $invoice->fresh()->status);
        Mail::assertNothingQueued();
    }
}
