<?php

namespace App\Console\Commands;

use App\Models\IntegrationEvent;
use App\Services\PayMongoService;
use Illuminate\Console\Command;

class VerifyPayMongoSandbox extends Command
{
    protected $signature='paymongo:verify-sandbox {--amount=1 : Test amount in PHP}';
    protected $description='Create a PayMongo test-mode checkout session without charging real money';

    public function handle(PayMongoService $payMongo):int
    {
        $key=(string)config('services.paymongo.secret_key');
        if(!$key){$this->error('PAYMONGO_SECRET_KEY is not configured.');return self::FAILURE;}
        if(!str_starts_with($key,'sk_test_')){$this->error('Refusing to run: only a PayMongo sk_test_ key is accepted.');return self::FAILURE;}
        if(!config('services.paymongo.webhook_secret'))$this->warn('Checkout can be created, but PAYMONGO_WEBHOOK_SECRET is not configured.');
        $amount=max(1,(float)$this->option('amount'));
        $result=$payMongo->createCheckoutSession(['line_items'=>[['amount'=>(int)round($amount*100),'currency'=>'PHP','name'=>'JVD sandbox readiness verification','quantity'=>1]],'description'=>'JVD management system sandbox verification','reference_number'=>'JVD-SANDBOX-'.now()->format('YmdHis'),'payment_method_types'=>['qrph','gcash','card']]);
        IntegrationEvent::create(['provider'=>'paymongo','event_type'=>'sandbox_checkout_created','external_id'=>$result['id']??null,'payload_hash'=>hash('sha256',json_encode(['amount'=>$amount,'at'=>now()->toIso8601String()])),
            'status'=>($result['success']??false)?'created':'failed','metadata'=>['amount'=>$amount,'test_mode'=>true,'checkout_url'=>$result['checkout_url']??null],'received_at'=>now(),'processed_at'=>now(),'error'=>$result['error']??null]);
        if(!($result['success']??false)){$this->error('PayMongo sandbox request failed: '.($result['error']??'Unknown error'));return self::FAILURE;}
        $this->info('PayMongo test checkout session created successfully.');
        $this->line('Session: '.$result['id']);
        $this->line('Checkout URL: '.($result['checkout_url']??'not returned'));
        $this->line('No payment was made; complete with PayMongo test credentials to exercise the webhook.');
        return self::SUCCESS;
    }
}
