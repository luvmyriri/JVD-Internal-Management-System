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
            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . base64_encode($this->secretKey . ':'),
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . '/checkout_sessions', [
                'data' => [
                    'attributes' => [
                        'send_email_receipt' => true,
                        'show_description' => true,
                        'show_line_items' => true,
                        'line_items' => $data['line_items'],
                        'payment_method_types' => $data['payment_method_types'] ?? ['gcash', 'card', 'paymaya'],
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
}
