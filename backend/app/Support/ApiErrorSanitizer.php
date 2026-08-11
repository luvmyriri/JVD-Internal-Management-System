<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ApiErrorSanitizer
{
    private const SENSITIVE_PATTERN = '/SQLSTATE|PDOException|QueryException|Stack trace:|Illuminate\\\\Database|vendor[\\\\\/]laravel|Connection:\s*(pgsql|mysql|sqlite)/i';

    public static function sanitize(Request $request, Response $response): Response
    {
        if (! $request->is('api/*') || $response->getStatusCode() < 400) {
            return $response;
        }

        $payload = self::jsonPayload($response);
        if (is_array($payload) && ! empty($payload['error_reference'])) {
            return $response;
        }

        $containsSensitiveDetails = preg_match(self::SENSITIVE_PATTERN, (string) $response->getContent()) === 1;
        if ($response->getStatusCode() < 500 && ! $containsSensitiveDetails) {
            return $response;
        }

        $reference = 'ERR-'.Str::upper(Str::random(10));
        Log::warning('API error response sanitized before delivery.', [
            'error_reference' => $reference,
            'status' => $response->getStatusCode(),
            'method' => $request->method(),
            'path' => $request->path(),
            'contained_sensitive_details' => $containsSensitiveDetails,
        ]);

        $safePayload = [
            'success' => false,
            'message' => 'The system could not complete this request. Please try again. If it continues, contact support with the reference below.',
            'error_reference' => $reference,
        ];
        $safeStatus = max(500, $response->getStatusCode());

        if ($response instanceof JsonResponse) {
            $response->setData($safePayload);
            $response->setStatusCode($safeStatus);

            return $response;
        }

        return response()->json($safePayload, $safeStatus);
    }

    private static function jsonPayload(Response $response): ?array
    {
        $decoded = json_decode((string) $response->getContent(), true);

        return is_array($decoded) ? $decoded : null;
    }
}
