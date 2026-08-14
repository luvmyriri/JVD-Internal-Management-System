<?php

namespace Tests\Feature;

use App\Models\PurchaseOrder;
use App\Models\User;
use App\Notifications\ActionableApprovalNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class ApprovalActionSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_approval_email_links_to_authenticated_review_instead_of_a_mutating_get(): void
    {
        config(['app.frontend_url' => 'https://management.example.test']);
        $approver = User::factory()->create(['role' => 'accounting_executive']);

        $message = (new ActionableApprovalNotification(
            'Purchase Order Review',
            'A purchase order needs review.',
            'purchase_order',
            42,
            ['Reference' => 'PO-42'],
        ))->toMail($approver);

        $this->assertSame(
            'https://management.example.test/procurement/purchase-orders?review_type=purchase_order&review_id=42',
            $message->viewData['reviewUrl']
        );
        $this->assertArrayNotHasKey('approveUrl', $message->viewData);
        $this->assertArrayNotHasKey('rejectUrl', $message->viewData);

        $workOrderNotification = new ActionableApprovalNotification(
            'Work Order Review',
            'A work order needs review.',
            'work_order',
            7,
            ['Reference' => 'WO-7'],
        );
        $this->assertSame(
            '/procurement/work-orders?review_type=work_order&review_id=7',
            $workOrderNotification->toArray($approver)['link']
        );
    }

    public function test_legacy_signed_get_redirects_without_changing_the_record(): void
    {
        config(['app.frontend_url' => 'https://management.example.test']);
        $purchaseOrder = PurchaseOrder::factory()->create([
            'status' => 'pending_ceo_approval',
        ]);

        $legacyUrl = URL::temporarySignedRoute(
            'public.action-request',
            now()->addMinute(),
            [
                'model_type' => 'purchase_order',
                'model_id' => $purchaseOrder->id,
                'action' => 'approve',
                'user_id' => User::factory()->create(['role' => 'executive_vice_president'])->id,
            ]
        );

        $this->get($legacyUrl)->assertRedirect(
            "https://management.example.test/procurement/purchase-orders?review_type=purchase_order&review_id={$purchaseOrder->id}"
        );

        $this->assertSame('pending_ceo_approval', $purchaseOrder->fresh()->status);
        $this->assertNull($purchaseOrder->fresh()->approved_by);
    }

    public function test_unsigned_legacy_action_link_is_rejected_without_changing_the_record(): void
    {
        $purchaseOrder = PurchaseOrder::factory()->create([
            'status' => 'pending_ceo_approval',
        ]);

        $this->get('/public/action-request?' . http_build_query([
            'model_type' => 'purchase_order',
            'model_id' => $purchaseOrder->id,
            'action' => 'approve',
            'user_id' => User::factory()->create(['role' => 'executive_vice_president'])->id,
        ]))
            ->assertOk()
            ->assertSee('Security Verification Failed');

        $this->assertSame('pending_ceo_approval', $purchaseOrder->fresh()->status);
        $this->assertNull($purchaseOrder->fresh()->approved_by);
    }

    public function test_dispatcher_cannot_verify_a_purchase_order_through_authenticated_api(): void
    {
        $dispatcher = User::factory()->create(['role' => 'dispatcher']);
        $purchaseOrder = PurchaseOrder::factory()->create([
            'status' => 'pending_accounting_review',
        ]);

        $this->actingAs($dispatcher)
            ->postJson("/api/v1/purchase-orders/{$purchaseOrder->id}/verify", ['approved' => true])
            ->assertForbidden();

        $this->assertSame('pending_accounting_review', $purchaseOrder->fresh()->status);
        $this->assertNull($purchaseOrder->fresh()->verified_by);
    }
}
