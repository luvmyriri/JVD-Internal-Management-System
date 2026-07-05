<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. legal_documents -> documents
        $legalDocs = DB::table('legal_documents')->get();
        foreach ($legalDocs as $doc) {
            $docId = DB::table('documents')->insertGetId([
                'doc_number' => 'JVD-DOC-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT),
                'title' => $doc->title,
                'file_path' => $doc->file_path,
                'uploaded_by' => $doc->uploaded_by,
                'source' => 'uploaded',
                'status' => 'active',
                'created_at' => $doc->created_at,
                'updated_at' => $doc->updated_at,
            ]);

            // Link to JobOrder
            if ($doc->job_order_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\JobOrder',
                    'linkable_id' => $doc->job_order_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // 2. procurement_documents -> documents
        $procDocs = DB::table('procurement_documents')->get();
        foreach ($procDocs as $doc) {
            $docId = DB::table('documents')->insertGetId([
                'doc_number' => 'JVD-DOC-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT),
                'title' => $doc->title,
                'file_path' => $doc->file_path,
                'uploaded_by' => $doc->uploaded_by,
                'source' => 'uploaded',
                'status' => 'active',
                'created_at' => $doc->created_at,
                'updated_at' => $doc->updated_at,
            ]);

            // Link to associated entities
            if ($doc->supplier_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\Supplier',
                    'linkable_id' => $doc->supplier_id,
                ]);
            }
            if ($doc->inventory_item_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\InventoryItem',
                    'linkable_id' => $doc->inventory_item_id,
                ]);
            }
            if ($doc->driver_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\User',
                    'linkable_id' => $doc->driver_id,
                ]);
            }
            if ($doc->transaction_type && $doc->transaction_id) {
                // Determine model class based on transaction_type (purchase_order, job_order, general)
                $type = null;
                if ($doc->transaction_type === 'purchase_order') $type = 'App\Models\PurchaseOrder';
                if ($doc->transaction_type === 'job_order') $type = 'App\Models\JobOrder';
                
                if ($type) {
                    DB::table('document_links')->insert([
                        'document_id' => $docId,
                        'linkable_type' => $type,
                        'linkable_id' => $doc->transaction_id,
                    ]);
                }
            }
        }

        // 3. passport_case_documents -> documents
        $passportDocs = DB::table('passport_case_documents')->get();
        foreach ($passportDocs as $doc) {
            $docId = DB::table('documents')->insertGetId([
                'doc_number' => 'JVD-DOC-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT),
                'title' => $doc->title,
                'file_path' => $doc->file_path,
                'uploaded_by' => $doc->uploaded_by,
                'source' => 'uploaded',
                'status' => 'active',
                'created_at' => $doc->created_at,
                'updated_at' => $doc->updated_at,
            ]);

            if ($doc->passport_case_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\PassportCase',
                    'linkable_id' => $doc->passport_case_id,
                ]);
            }
            if ($doc->customer_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\Customer',
                    'linkable_id' => $doc->customer_id,
                ]);
            }
        }

        // 4. job_application_documents -> documents
        $jobAppDocs = DB::table('job_application_documents')->get();
        foreach ($jobAppDocs as $doc) {
            $docId = DB::table('documents')->insertGetId([
                'doc_number' => 'JVD-DOC-' . date('Y') . '-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT),
                'title' => $doc->title,
                'file_path' => $doc->file_path,
                'uploaded_by' => $doc->uploaded_by,
                'source' => 'uploaded',
                'status' => 'active',
                'created_at' => $doc->created_at,
                'updated_at' => $doc->updated_at,
            ]);

            if ($doc->job_application_id) {
                DB::table('document_links')->insert([
                    'document_id' => $docId,
                    'linkable_type' => 'App\Models\JobApplication',
                    'linkable_id' => $doc->job_application_id,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Rollback is complex due to polymorphic relation. We will just empty the new tables.
        DB::table('document_links')->truncate();
        DB::table('documents')->truncate();
    }
};
