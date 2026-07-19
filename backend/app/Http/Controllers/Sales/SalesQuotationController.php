<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\SalesQuotation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesQuotationController extends Controller
{
    /** Persist a customer-facing sales quotation and assign a sequential number. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'            => ['nullable', 'integer', 'exists:customers,id'],
            'client_name'            => ['required', 'string', 'max:255'],
            'client_company'         => ['nullable', 'string', 'max:255'],
            'client_address'         => ['nullable', 'string', 'max:500'],
            'client_contact'         => ['nullable', 'string', 'max:100'],
            'client_email'           => ['nullable', 'email', 'max:255'],
            'client_tin'             => ['nullable', 'string', 'max:50'],
            'service_id'             => ['nullable', 'integer', 'exists:services,id'],
            'service_name'           => ['nullable', 'string', 'max:255'],
            'category'               => ['nullable', 'string', 'max:255'],
            'line_items'             => ['required', 'array', 'min:1'],
            'line_items.*.description' => ['required', 'string', 'max:255'],
            'line_items.*.unit_price'  => ['required', 'numeric', 'min:0'],
            'line_items.*.quantity'    => ['required', 'numeric', 'min:0'],
            'description'            => ['nullable', 'string'],
            'inclusions'            => ['nullable', 'string'],
            'exclusions'            => ['nullable', 'string'],
            'travel_date'           => ['nullable', 'date'],
            'valid_days'            => ['nullable', 'integer', 'min:1', 'max:365'],
            'notes'                 => ['nullable', 'string'],
        ]);

        // Recompute each amount server-side (never trust a client-sent total).
        $items = array_map(function ($line) {
            $unit = round((float) $line['unit_price'], 2);
            $qty = (float) $line['quantity'];
            return [
                'description' => $line['description'],
                'unit_price'  => $unit,
                'quantity'    => $qty,
                'amount'      => round($unit * $qty, 2),
            ];
        }, $validated['line_items']);

        // Service prices are VAT-inclusive, so decompose the grand total into a
        // BIR-standard breakdown rather than adding 12% on top (which would double-charge).
        $vatRate = 12.0;
        $total = round(array_sum(array_column($items, 'amount')), 2);
        $subtotal = round($total / (1 + $vatRate / 100), 2);
        $vat = round($total - $subtotal, 2);

        $validDays = $validated['valid_days'] ?? 15;

        $quotation = DB::transaction(function () use ($validated, $items, $total, $subtotal, $vat, $vatRate, $validDays, $request) {
            $year = now()->year;
            $prefix = "JVD-QT-{$year}-";

            // Lock existing rows for this year to serialize the sequence assignment.
            $last = SalesQuotation::where('quotation_number', 'like', $prefix . '%')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('quotation_number');
            $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;
            $number = $prefix . str_pad((string) $next, 6, '0', STR_PAD_LEFT);

            return SalesQuotation::create([
                'quotation_number' => $number,
                'customer_id'      => $validated['customer_id'] ?? null,
                'client_name'      => $validated['client_name'],
                'client_company'   => $validated['client_company'] ?? null,
                'client_address'   => $validated['client_address'] ?? null,
                'client_contact'   => $validated['client_contact'] ?? null,
                'client_email'     => $validated['client_email'] ?? null,
                'client_tin'       => $validated['client_tin'] ?? null,
                'service_id'       => $validated['service_id'] ?? null,
                'service_name'     => $validated['service_name'] ?? null,
                'category'         => $validated['category'] ?? null,
                'line_items'       => $items,
                'description'      => $validated['description'] ?? null,
                'inclusions'       => $validated['inclusions'] ?? null,
                'exclusions'       => $validated['exclusions'] ?? null,
                'subtotal'         => $subtotal,
                'vat_amount'       => $vat,
                'total'            => $total,
                'vat_rate'         => $vatRate,
                'travel_date'      => $validated['travel_date'] ?? null,
                'valid_until'      => now()->addDays($validDays)->toDateString(),
                'status'           => 'draft',
                'notes'            => $validated['notes'] ?? null,
                'prepared_by'      => $request->user()->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'data'    => $quotation->load('preparer:id,first_name,last_name'),
        ], 201);
    }
}
