<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$d = App\Models\User::where('role', 'driver')->first();
if ($d) {
    dump($d->custom_permissions);
    dump($d->getAllPermissions());
}
