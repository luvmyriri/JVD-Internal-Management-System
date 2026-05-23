with open('backend/app/Http/Controllers/Procurement/PurchaseOrderController.php', 'r') as f:
    code = f.read()

import_code = 'use App\\Models\\InventoryItem;\n'
if import_code not in code:
    code = code.replace('use App\\Models\\PurchaseOrder;', 'use App\\Models\\PurchaseOrder;\nuse App\\Models\\InventoryItem;')

update_code = '''
        if ($request->approved) {
            foreach ($purchaseOrder->lineItems as $item) {
                $inventory = InventoryItem::firstOrCreate(
                    ['item_name' => $item->item_name],
                    [
                        'category' => 'General',
                        'quantity' => 0,
                        'reorder_level' => 10,
                        'unit' => $item->unit_of_measure ?? 'pcs',
                        'unit_cost' => $item->unit_price,
                    ]
                );
                
                $inventory->quantity += $item->quantity;
                $inventory->unit_cost = $item->unit_price;
                $inventory->save();
            }
        }
'''

target = '        \\App\\Http\\Services\\NotificationService::notifyPoStatusUpdate($purchaseOrder, $purchaseOrder->status);'

if 'InventoryItem::firstOrCreate' not in code:
    code = code.replace(target, update_code + '\n' + target)

with open('backend/app/Http/Controllers/Procurement/PurchaseOrderController.php', 'w') as f:
    f.write(code)
