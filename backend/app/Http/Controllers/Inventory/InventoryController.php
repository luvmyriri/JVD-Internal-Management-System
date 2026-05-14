<?php

namespace App\Http\Controllers\Inventory;

use App\Http\Controllers\Controller;
use App\Http\Resources\InventoryItemResource;
use App\Models\InventoryItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    /**
     * List inventory items — filterable by category and low_stock flag.
     */
    public function index(Request $request): JsonResponse
    {
        $query = InventoryItem::query();

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // ?low_stock=true surfaces items at or below their reorder level
        if ($request->boolean('low_stock')) {
            $query->whereColumn('quantity', '<=', 'reorder_level');
        }

        if ($request->filled('search')) {
            $query->where('item_name', 'ilike', '%' . $request->search . '%');
        }

        $items = $query->orderBy('category')
                       ->orderBy('item_name')
                       ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data'    => InventoryItemResource::collection($items)->resolve(),
            'meta'    => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'per_page'     => $items->perPage(),
                'total'        => $items->total(),
                'low_stock_count' => InventoryItem::whereColumn('quantity', '<=', 'reorder_level')->count(),
            ],
        ]);
    }

    /**
     * Create a new inventory item.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_name'     => ['required', 'string', 'max:255'],
            'category'      => ['required', 'string', 'max:100'],
            'quantity'      => ['required', 'integer', 'min:0'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'unit'          => ['required', 'string', 'max:30'],
            'unit_cost'     => ['required', 'numeric', 'min:0'],
        ]);

        $item = InventoryItem::create($validated);

        return response()->json([
            'success' => true,
            'data'    => new InventoryItemResource($item),
            'message' => 'Inventory item created successfully.',
        ], 201);
    }

    /**
     * Get a single inventory item.
     */
    public function show(InventoryItem $inventoryItem): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => new InventoryItemResource($inventoryItem),
        ]);
    }

    /**
     * Update item details or adjust quantity.
     */
    public function update(Request $request, InventoryItem $inventoryItem): JsonResponse
    {
        $validated = $request->validate([
            'item_name'     => ['sometimes', 'string', 'max:255'],
            'category'      => ['sometimes', 'string', 'max:100'],
            'quantity'      => ['sometimes', 'integer', 'min:0'],
            'reorder_level' => ['sometimes', 'integer', 'min:0'],
            'unit'          => ['sometimes', 'string', 'max:30'],
            'unit_cost'     => ['sometimes', 'numeric', 'min:0'],
        ]);

        $inventoryItem->update($validated);

        return response()->json([
            'success' => true,
            'data'    => new InventoryItemResource($inventoryItem->fresh()),
            'message' => 'Inventory item updated.',
        ]);
    }
}
