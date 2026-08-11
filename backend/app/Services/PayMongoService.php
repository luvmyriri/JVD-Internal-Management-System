<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayMongoService
{
    protected $secretKey;
    protected $baseUrl = 'https://api.paymongo.com/v1';

    public function __construct()
    {
        $this->secretKey = config('services.paymongo.secret_key');
    }

    /**
     * Create a Checkout Session
     */
    public function createCheckoutSession($data)
    {
        if (!$this->secretKey) {
            Log::error('PayMongo checkout blocked because the secret key is not configured.');
            return [
                'success' => false,
                'error' => 'Online payment is temporarily unavailable. Please contact accounting.',
            ];
        }

        try {
            $response = Http::connectTimeout(10)->timeout(30)->retry(2, 300)->withHeaders([
                'Authorization' => 'Basic ' . base64_encode($this->secretKey . ':'),
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/checkout_sessions', [
                'data' => [
                    'attributes' => [
                        'send_email_receipt' => true,
                        'show_description' => true,
                        'show_line_items' => true,
                        'line_items' => $data['line_items'],
                        'payment_method_types' => $data['payment_method_types'] ?? ['gcash', 'card', 'paymaya', 'qrph'],
                        'description' => $data['description'] ?? 'JVD POS Transaction',
                        'reference_number' => $data['reference_number'] ?? null,
                        'success_url' => $data['success_url'] ?? config('app.frontend_url', config('app.url')),
                        'cancel_url' => $data['cancel_url'] ?? config('app.frontend_url', config('app.url')),
                    ]
                ]
            ]);

            if ($response->successful()) {
                $attributes = $response->json()['data']['attributes'];
                return [
                    'success' => true,
                    'checkout_url' => $attributes['checkout_url'],
                    'id' => $response->json()['data']['id']
                ];
            }

            Log::error('PayMongo Session Creation Failed: ' . $response->body());
            return ['success' => false, 'error' => 'PayMongo could not create the payment checkout.'];

        } catch (\Exception $e) {
            Log::error('PayMongo Exception: ' . $e->getMessage());
            return ['success' => false, 'error' => 'PayMongo could not be reached. Please try again.'];
        }
    }

    /**
     * Create a Refund via PayMongo API
     */
    public function createRefund(string $paymentId, float $amount, string $reason = 'requested_by_customer'): array
    {
        if (! $this->secretKey) {
            Log::error('PayMongo refund blocked because the secret key is not configured.');

            return ['success' => false, 'error' => 'PayMongo is not configured. Refund was not sent.'];
        }

        if (! str_starts_with($paymentId, 'pay_')) {
            Log::error('PayMongo refund blocked because the original payment id is invalid.', ['payment_id' => $paymentId]);

            return ['success' => false, 'error' => 'The original PayMongo payment reference is invalid.'];
        }

        try {
            $amountInCents = (int) round($amount * 100);
            $response = Http::connectTimeout(10)->timeout(30)->withHeaders([
                'Authorization' => 'Basic ' . base64_encode($this->secretKey . ':'),
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/refunds', [
                'data' => [
                    'attributes' => [
                        'amount' => $amountInCents,
                        'payment_id' => $paymentId,
                        'reason' => $reason,
                        'notes' => 'JVD Internal Management System Processed Refund',
                    ]
                ]
            ]);

            if ($response->successful()) {
                $attributes = $response->json()['data']['attributes'] ?? [];
                return [
                    'success' => true,
                    'refund_id' => $response->json()['data']['id'],
                    'status' => $attributes['status'] ?? 'succeeded',
                    'amount' => ($attributes['amount'] ?? $amountInCents) / 100,
                    'payment_id' => $attributes['payment_id'] ?? $paymentId,
                ];
            }

            Log::error('PayMongo Refund Failed: ' . $response->body());
            return ['success' => false, 'error' => $response->json()['errors'][0]['detail'] ?? 'PayMongo Refund Error'];

        } catch (\Exception $e) {
            Log::error('PayMongo Refund Exception: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
