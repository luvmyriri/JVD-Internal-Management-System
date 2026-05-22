<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$u = \App\Models\User::find(10);
$u->password = \Illuminate\Support\Facades\Hash::make('password123');
$u->save();
echo "OK\n";
