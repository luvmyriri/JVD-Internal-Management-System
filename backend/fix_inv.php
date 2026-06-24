<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$inv = App\Models\Invoice::where('cash_budget_request_id', 7)->first();
if($inv && $inv->status !== 'disbursed_budget') {
    $inv->cash_budget_request_id = null;
    $inv->save();
    echo "Fixed tainted invoice\n";
} else {
    echo "No tainted invoice found or already fixed\n";
}
