<?php

namespace App\Http\Controllers\Sales;

use App\Http\Controllers\Controller;
use App\Models\SalesQuotation;
use App\Models\Service;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SalesQuotationController extends Controller
{
    /** Persist a customer-facing sales quotation and assign a sequential number. */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => ['nullable', 'integer', 'exists:customers,id'],
            'client_name' => ['required', 'string', 'max:255'],
            'client_company' => ['nullable', 'string', 'max:255'],
            'client_address' => ['nullable', 'string', 'max:500'],
            'client_contact' => ['nullable', 'string', 'max:100'],
            'client_email' => ['nullable', 'email', 'max:255'],
            'client_tin' => ['nullable', 'string', 'max:50'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'service_name' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'line_items' => ['required_without:service_id', 'nullable', 'array', 'min:1'],
            'line_items.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'line_items.*.description' => ['required', 'string', 'max:255'],
            'line_items.*.unit_price' => ['required', 'numeric', 'min:0'],
            'line_items.*.quantity' => ['required', 'numeric', 'min:0'],
            'pricing_context' => ['sometimes', 'array'],
            'pricing_context.vehicle' => ['sometimes', 'string', 'in:bus,coaster'],
            'pricing_context.extra_days' => ['sometimes', 'integer', 'min:0', 'max:365'],
            'pricing_context.extra_hours' => ['sometimes', 'integer', 'min:0', 'max:10000'],
            'pricing_context.adults' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'pricing_context.children' => ['sometimes', 'integer', 'min:0', 'max:5000'],
            'description' => ['nullable', 'string'],
            'inclusions' => ['nullable', 'string'],
            'exclusions' => ['nullable', 'string'],
            'travel_date' => ['nullable', 'date'],
            'valid_days' => ['nullable', 'integer', 'min:1', 'max:365'],
            'notes' => ['nullable', 'string'],
        ]);

        $validDays = $validated['valid_days'] ?? 15;

        $quotation = DB::transaction(function () use ($validated, $validDays, $request) {
            $quotationServiceId = isset($validated['service_id'])
                ? (int) $validated['service_id']
                : null;

            $submittedItems = $validated['line_items'] ?? [];

            foreach ($submittedItems as $index => $line) {
                $lineServiceId = isset($line['service_id']) ? (int) $line['service_id'] : null;

                if ($quotationServiceId !== null
                    && $lineServiceId !== null
                    && $lineServiceId !== $quotationServiceId) {
                    throw ValidationException::withMessages([
                        "line_items.{$index}.service_id" => [
                            'A line item service must match the quotation service.',
                        ],
                    ]);
                }
            }

            $serviceIds = collect($submittedItems)
                ->pluck('service_id')
                ->push($quotationServiceId)
                ->filter(fn ($id) => $id !== null)
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values();

            // Lock the referenced catalog rows so each saved quotation contains one
            // coherent price snapshot even if a catalog editor is working concurrently.
            $services = Service::query()
                ->whereIn('id', $serviceIds)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($services->count() !== $serviceIds->count()) {
                throw ValidationException::withMessages([
                    'line_items' => ['A selected catalog service no longer exists.'],
                ]);
            }

            $inactiveService = $services->first(
                fn (Service $service) => ! $service->is_active
            );
            if ($inactiveService) {
                throw ValidationException::withMessages([
                    'service_id' => ['The selected service is no longer active.'],
                ]);
            }

            $quotationService = $quotationServiceId !== null
                ? $services->get($quotationServiceId)
                : null;
            $pricingContext = $validated['pricing_context'] ?? [];

            // A quotation-level catalog selection describes one package. Its rows
            // are reconstructed entirely from the locked Service snapshot and the
            // validated, non-price booking selections. Submitted rows are ignored.
            $items = $quotationService
                ? $this->catalogItems($quotationService, $pricingContext)
                : $this->standaloneItems($submittedItems, $services, $pricingContext);

            // Catalog and entered line prices are VAT-exclusive, matching invoice
            // finalization. SystemSetting stores a fractional rate (for example,
            // 0.12), while quotations snapshot the display percentage (12.00).
            $configuredVatRate = max(0.0, (float) SystemSetting::getValue('vat_rate', 0.12));
            $vatFraction = $configuredVatRate > 1 ? $configuredVatRate / 100 : $configuredVatRate;
            $vatRate = round($vatFraction * 100, 2);
            $subtotal = round(array_sum(array_column($items, 'amount')), 2);
            $vat = round($subtotal * $vatFraction, 2);
            $total = round($subtotal + $vat, 2);

            $year = now()->year;
            $prefix = "JVD-QT-{$year}-";

            // Lock existing rows for this year to serialize the sequence assignment.
            $last = SalesQuotation::where('quotation_number', 'like', $prefix.'%')
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('quotation_number');
            $next = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;
            $number = $prefix.str_pad((string) $next, 6, '0', STR_PAD_LEFT);

            return SalesQuotation::create([
                'quotation_number' => $number,
                'customer_id' => $validated['customer_id'] ?? null,
                'client_name' => $validated['client_name'],
                'client_company' => $validated['client_company'] ?? null,
                'client_address' => $validated['client_address'] ?? null,
                'client_contact' => $validated['client_contact'] ?? null,
                'client_email' => $validated['client_email'] ?? null,
                'client_tin' => $validated['client_tin'] ?? null,
                'service_id' => $validated['service_id'] ?? null,
                'service_name' => $quotationService?->name ?? ($validated['service_name'] ?? null),
                'category' => $quotationService?->category ?? ($validated['category'] ?? null),
                'line_items' => $items,
                'description' => $validated['description'] ?? null,
                'inclusions' => $validated['inclusions'] ?? null,
                'exclusions' => $validated['exclusions'] ?? null,
                'subtotal' => $subtotal,
                'vat_amount' => $vat,
                'total' => $total,
                'vat_rate' => $vatRate,
                'travel_date' => $validated['travel_date'] ?? null,
                'valid_until' => now()->addDays($validDays)->toDateString(),
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
                'prepared_by' => $request->user()->id,
            ]);
        });

        return response()->json([
            'success' => true,
            'data' => $quotation->load('preparer:id,first_name,last_name'),
        ], 201);
    }

    /**
     * Build authoritative rows for a quotation-level catalog service.
     *
     * @return array<int, array{service_id: int, description: string, unit_price: float, quantity: int|float, amount: float}>
     */
    private function catalogItems(Service $service, array $context): array
    {
        if ($service->is_tour) {
            $this->requirePricingSelections($context, ['vehicle', 'extra_days', 'extra_hours']);

            $vehicle = $context['vehicle'];
            $basePrice = $vehicle === 'bus' ? $service->bus_price : $service->coaster_price;
            if ($basePrice === null) {
                throw ValidationException::withMessages([
                    'pricing_context.vehicle' => ['The selected vehicle has no catalog price for this service.'],
                ]);
            }

            $vehicleLabel = $vehicle === 'bus' ? 'Bus' : 'Coaster';
            $items = [
                $this->catalogItem($service, "Vehicle Rental ({$vehicleLabel})", (float) $basePrice, 1),
            ];

            $extraDays = (int) $context['extra_days'];
            if ($extraDays > 0) {
                $items[] = $this->catalogItem(
                    $service,
                    'Extra Rental Days',
                    (float) config("sales_quotation.tour_extra_rates.{$vehicle}.day"),
                    $extraDays
                );
            }

            $extraHours = (int) $context['extra_hours'];
            if ($extraHours > 0) {
                $items[] = $this->catalogItem(
                    $service,
                    'Extra Rental Hours',
                    (float) config("sales_quotation.tour_extra_rates.{$vehicle}.hour"),
                    $extraHours
                );
            }

            return $items;
        }

        if ($service->has_booking_fields) {
            $this->requirePricingSelections($context, ['adults', 'children']);

            $adults = (int) $context['adults'];
            $children = (int) $context['children'];
            if ($adults + $children < 1) {
                throw ValidationException::withMessages([
                    'pricing_context.adults' => ['At least one adult or child must be selected.'],
                ]);
            }

            $items = [];
            if ($adults > 0) {
                $items[] = $this->catalogItem(
                    $service,
                    'Adult Guest Tickets',
                    (float) ($service->adult_price ?? $service->price),
                    $adults
                );
            }

            if ($children > 0) {
                $discount = rtrim(rtrim(number_format((float) ($service->child_discount ?? 0), 2), '0'), '.');
                $description = (float) ($service->child_discount ?? 0) > 0
                    ? "Child Guest Tickets ({$discount}% off)"
                    : 'Child Guest Tickets';
                $items[] = $this->catalogItem(
                    $service,
                    $description,
                    (float) ($service->child_price ?? $service->price),
                    $children
                );
            }

            return $items;
        }

        return [$this->catalogItem($service, 'Standard Base Rate', (float) $service->price, 1)];
    }

    /**
     * Price lines that do not use a quotation-level service. Generic catalog
     * lines remain server-priced; only service-less lines retain entered prices.
     *
     * @param  \Illuminate\Support\Collection<int, Service>  $services
     * @return array<int, array{service_id: int|null, description: string, unit_price: float, quantity: int|float, amount: float}>
     */
    private function standaloneItems(array $submittedItems, $services, array $pricingContext): array
    {
        foreach ($submittedItems as $index => $line) {
            $serviceId = isset($line['service_id']) ? (int) $line['service_id'] : null;
            $service = $serviceId !== null ? $services->get($serviceId) : null;

            if ($service && ($service->is_tour || $service->has_booking_fields)) {
                if (count($submittedItems) !== 1) {
                    throw ValidationException::withMessages([
                        "line_items.{$index}.service_id" => [
                            'A specialized catalog service must be quoted on its own.',
                        ],
                    ]);
                }

                return $this->catalogItems($service, $pricingContext);
            }
        }

        return array_map(function (array $line) use ($services) {
            $serviceId = isset($line['service_id']) ? (int) $line['service_id'] : null;
            $service = $serviceId !== null ? $services->get($serviceId) : null;
            $unitPrice = round((float) ($service?->price ?? $line['unit_price']), 2);
            $quantity = (float) $line['quantity'];

            return [
                'service_id' => $service?->id,
                'description' => $service?->name ?? $line['description'],
                'unit_price' => $unitPrice,
                'quantity' => $quantity,
                'amount' => round($unitPrice * $quantity, 2),
            ];
        }, $submittedItems);
    }

    private function requirePricingSelections(array $context, array $keys): void
    {
        $messages = [];
        foreach ($keys as $key) {
            if (! array_key_exists($key, $context)) {
                $messages["pricing_context.{$key}"] = ['This catalog pricing selection is required.'];
            }
        }

        if ($messages !== []) {
            throw ValidationException::withMessages($messages);
        }
    }

    /**
     * @return array{service_id: int, description: string, unit_price: float, quantity: int|float, amount: float}
     */
    private function catalogItem(Service $service, string $description, float $unitPrice, int|float $quantity): array
    {
        $unitPrice = round($unitPrice, 2);

        return [
            'service_id' => $service->id,
            'description' => $description,
            'unit_price' => $unitPrice,
            'quantity' => $quantity,
            'amount' => round($unitPrice * $quantity, 2),
        ];
    }
}
