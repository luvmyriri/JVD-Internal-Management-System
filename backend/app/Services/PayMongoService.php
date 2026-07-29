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
            Log::warning('PayMongo Secret Key not configured. Using mock response.');
            return [
                'success' => true,
                'checkout_url' => null, // No URL means it's a mock/auto-success
                'id' => 'mock_' . uniqid()
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
            return ['success' => false, 'error' => $response->json()['errors'][0]['detail'] ?? 'PayMongo Error'];

        } catch (\Exception $e) {
            Log::error('PayMongo Exception: ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Create a Refund via PayMongo API
     */
    public function createRefund(string $paymentId, float $amount, string $reason = 'requested_by_customer'): array
    {
        if (!$this->secretKey || str_starts_with($paymentId, 'mock_')) {
            Log::warning('PayMongo Secret Key not configured or mock transaction. Simulating mock refund.');
            return [
                'success' => true,
                'refund_id' => 'mock_ref_' . uniqid(),
                'status' => 'succeeded',
                'amount' => $amount,
            ];
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
