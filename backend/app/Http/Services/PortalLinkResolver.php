<?php

namespace App\Http\Services;

use Illuminate\Http\Request;

/**
 * Resolves the public-facing base URL for customer-portal links (document-request emails,
 * KYC links, contract-signature links). Extracted from PassportCaseController::sendDocumentRequest
 * so the same ngrok/referer/origin/env fallback chain is shared across all link-generating call sites.
 */
class PortalLinkResolver
{
    public static function resolveBaseUrl(?Request $request = null): string
    {
        $request = $request ?? request();
        $baseUrl = null;

        // 1. Try ngrok tunnel (local dev convenience)
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 1.0]]);
            $tunnelsJson = @file_get_contents('http://127.0.0.1:4040/api/tunnels', false, $ctx);
            if ($tunnelsJson) {
                $tunnelsData = json_decode($tunnelsJson, true);
                if (isset($tunnelsData['tunnels']) && is_array($tunnelsData['tunnels'])) {
                    foreach ($tunnelsData['tunnels'] as $tunnel) {
                        if (isset($tunnel['public_url']) && str_starts_with($tunnel['public_url'], 'https://')) {
                            $baseUrl = rtrim($tunnel['public_url'], '/');
                            break;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
        }

        // 2. Referer header
        if (!$baseUrl && $request) {
            $referer = $request->headers->get('referer');
            if ($referer) {
                $parsed = parse_url($referer);
                if (isset($parsed['scheme']) && isset($parsed['host'])) {
                    $baseUrl = $parsed['scheme'] . '://' . $parsed['host'] . (isset($parsed['port']) ? ':' . $parsed['port'] : '');
                }
            }
        }

        // 3. Origin header
        if (!$baseUrl && $request) {
            $origin = $request->headers->get('origin');
            if ($origin) {
                $baseUrl = rtrim($origin, '/');
            }
        }

        // 4. Fallback to env
        if (!$baseUrl) {
            $frontendUrls = explode(',', env('FRONTEND_URL', 'http://localhost:3000'));
            $baseUrl = rtrim($frontendUrls[0], '/');
            if ($request) {
                $requestHost = $request->getHost();
                foreach ($frontendUrls as $url) {
                    if (str_contains($url, $requestHost)) {
                        $baseUrl = rtrim($url, '/');
                        break;
                    }
                }
            }
        }

        return $baseUrl;
    }

    public static function buildPortalLink(string $token, ?Request $request = null): string
    {
        return self::resolveBaseUrl($request) . '/portal/' . $token;
    }
}
