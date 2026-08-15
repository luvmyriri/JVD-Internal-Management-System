<?php

use App\Http\Middleware\AuditLogger;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\EnforcePasswordChange;
use App\Http\Middleware\SanitizeApiErrorResponses;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\TrackUserOnlineStatus;
use App\Http\Middleware\VerifyTwoFactor;
use App\Support\ApiErrorSanitizer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Route;
use Sentry\Laravel\Integration;
use Symfony\Component\HttpFoundation\Response;

$tempDir = __DIR__.'/../storage/app/temp';
if (! is_dir($tempDir)) {
    @mkdir($tempDir, 0777, true);
}
@ini_set('upload_tmp_dir', $tempDir);
@ini_set('sys_temp_dir', $tempDir);

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        then: function () {
            $apiPath = __DIR__.'/../routes/api/v1';
            if (is_dir($apiPath)) {
                $files = glob($apiPath.'/*.php');
                foreach ($files as $file) {
                    Route::middleware(['api', 'throttle:api'])
                        ->prefix('api/v1')
                        ->group($file);
                }
            }
        }
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Register custom middleware aliases
        $middleware->alias([
            'role' => CheckRole::class,
            'audit' => AuditLogger::class,
            'verify.2fa' => VerifyTwoFactor::class,
            'enforce.password.change' => EnforcePasswordChange::class,
        ]);

        // Apply audit logging to all API routes
        $middleware->api(append: [
            SecurityHeaders::class,
            SanitizeApiErrorResponses::class,
            AuditLogger::class,
            TrackUserOnlineStatus::class,
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
        Integration::handles($exceptions);
        $exceptions->reportable(function (\Throwable $e) {
            if (app()->runningUnitTests() || request()?->is('api/v1/testing/*')) {
                return false;
            }
        });
        $exceptions->respond(function (Response $response) {
            return ApiErrorSanitizer::sanitize(request(), $response);
        });
    })->create();
