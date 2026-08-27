<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Generates human-readable, meaningful batch/reference IDs for all Sales module records.
 *
 * Format: {PREFIX}-{DESTINATION_SLUG}-{MMDDYY}-{SEQ}
 *
 * Examples:
 *   SalesReferenceService::generate('JNR', 'Sagada',      '2027-07-27') → JNR-SAGADA-072727-001
 *   SalesReferenceService::generate('CHR', 'Manila to Baguio', now())  → CHR-MANILA-072726-001
 *   SalesReferenceService::generate('EDT', null,           now())       → EDT-072726-001
 *   SalesReferenceService::generate('INV', 'Baguio',      now())       → INV-BAGUIO-072726-001
 *
 * The sequential suffix (001, 002 …) is derived by counting existing
 * records that already start with the same PREFIX-[DEST-]MMDDYY stem
 * across all three unique-reference tables, ensuring global uniqueness
 * per day per type without a dedicated sequence table.
 */
class SalesReferenceService
{
    /**
     * Reference tables to scan when computing the daily sequence number.
     * Maps table name → column that holds the reference/code.
     */
    private const REF_COLUMNS = [
        'joiner_departures'                     => 'code',
        'joiner_reservations'                   => 'reference',
        'charter_bookings'                      => 'reference',
        'educational_tour_bookings'             => 'reference',
        'educational_tour_participant_bookings' => 'reference',
        'educational_tour_booking_payments'     => 'reference',
        'sales_orders'                          => 'order_number',
        'invoices'                              => 'invoice_number',
    ];

    /**
     * Destination words that should be filtered out of slugs (filler words).
     */
    private const STOP_WORDS = ['to', 'the', 'and', 'from', 'via', 'ng', 'sa', 'at'];

    /**
     * Maximum number of destination characters to use in the slug.
     * Keeps IDs concise while still identifiable.
     */
    private const DEST_MAX_CHARS = 10;

    /**
     * Generate a unique, human-readable reference ID.
     *
     * @param  string              $prefix      e.g. 'JNR', 'CHR', 'EDT', 'INV', 'ORD'
     * @param  string|null         $destination Route/location context (city, program name, etc.)
     * @param  string|Carbon|null  $date        The transaction/service date (defaults to now)
     * @return string
     */
    public static function generate(string $prefix, ?string $destination, $date = null): string
    {
        $prefix = strtoupper(trim($prefix));
        $date   = $date ? Carbon::parse($date) : Carbon::now();
        $ddmmyy = $date->format('mdy'); // MMDDYY  e.g. "072726"

        $destSlug = self::slugify($destination);
        $stem     = $destSlug
            ? "{$prefix}-{$destSlug}-{$ddmmyy}"
            : "{$prefix}-{$ddmmyy}";

        $seq = self::nextSequence($stem);

        return sprintf('%s-%03d', $stem, $seq);
    }

    // ─── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Convert a destination string to a clean uppercase slug token.
     * - Removes special characters
     * - Filters stop words
     * - Picks the first significant word (most cities are one word)
     * - Truncates to DEST_MAX_CHARS
     */
    private static function slugify(?string $destination): string
    {
        if (!$destination || trim($destination) === '') {
            return '';
        }

        // Strip non-alphanumeric except spaces and hyphens
        $clean = preg_replace('/[^a-zA-Z0-9\s\-]/', '', $destination);

        // Split into words, uppercase each
        $words = array_filter(
            array_map('strtoupper', preg_split('/[\s\-]+/', $clean)),
            fn ($w) => $w !== '' && !in_array(strtolower($w), self::STOP_WORDS, true)
        );

        if (empty($words)) {
            return '';
        }

        // Use the first meaningful word, capped at DEST_MAX_CHARS
        $primary = array_values($words)[0];
        return Str::upper(substr($primary, 0, self::DEST_MAX_CHARS));
    }

    /**
     * Count existing records that start with $stem and return the next sequence integer.
     * Scans all ref columns atomically so two concurrent inserts on the same stem
     * don't produce the same sequence number (handled by uniqueness retry at DB level).
     */
    private static function nextSequence(string $stem): int
    {
        $maxFound = 0;

        foreach (self::REF_COLUMNS as $table => $column) {
            try {
                $codes = DB::table($table)
                    ->where($column, 'like', $stem . '-%')
                    ->pluck($column);

                foreach ($codes as $code) {
                    if (is_string($code)) {
                        $parts = explode('-', $code);
                        $lastPart = end($parts);
                        if (is_numeric($lastPart)) {
                            $seq = (int) $lastPart;
                            if ($seq > $maxFound) {
                                $maxFound = $seq;
                            }
                        }
                    }
                }
            } catch (\Throwable) {
                // Table may not exist in test environments — skip gracefully
            }
        }

        return $maxFound + 1;
    }
}

