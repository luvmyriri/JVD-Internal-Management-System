<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            $apiPath = __DIR__.'/../routes/api/v1';
            if (is_dir($apiPath)) {
                $files = glob($apiPath . '/*.php');
                foreach ($files as $file) {
                    \Illuminate\Support\Facades\Route::middleware(['api', 'throttle:api'])
                        ->prefix('api/v1')
                        ->group($file);
                }
            }
        }
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register custom middleware aliases
        $middleware->alias([
            'role'                    => \App\Http\Middleware\CheckRole::class,
            'audit'                   => \App\Http\Middleware\AuditLogger::class,
            'verify.2fa'              => \App\Http\Middleware\VerifyTwoFactor::class,
            'enforce.password.change' => \App\Http\Middleware\EnforcePasswordChange::class,
        ]);

        // Apply audit logging to all API routes
        $middleware->api(append: [
            \App\Http\Middleware\AuditLogger::class,
            \App\Http\Middleware\TrackUserOnlineStatus::class,
        ]);

        $middleware->statefulApi();
        
        $middleware->preventRequestForgery(except: [
            'api/admin/settings/landing-page',
            'api/accreditations/*/submit-kyc',
            'api/accreditations/*/submit-kyc/upload/*',
        ]);
        // Apply audit logging to all API routes
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
