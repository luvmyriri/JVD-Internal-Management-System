<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Document;
use App\Models\User;
use App\Services\NotificationService;
use Carbon\Carbon;

class NotifyExpiringDocuments extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'documents:notify-expiring';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Scan documents for upcoming expiry dates and send notifications';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Scanning for expiring documents...');

        // Find documents expiring in exactly 30 days, 15 days, 7 days, and 1 day.
        $targetDates = [
            Carbon::now()->addDays(30)->toDateString(),
            Carbon::now()->addDays(15)->toDateString(),
            Carbon::now()->addDays(7)->toDateString(),
            Carbon::now()->addDays(1)->toDateString(),
        ];

        $expiringDocs = Document::whereIn('expiry_date', $targetDates)
            ->where('status', 'active')
            ->get();

        if ($expiringDocs->isEmpty()) {
            $this->info('No documents expiring on target dates.');
            return;
        }

        // We can notify super_admin, operations_manager, or executive_vice_president
        // Better yet, just use a generic permission-based role or the system's NotificationService
        
        $adminRoles = ['super_admin', 'executive_vice_president', 'operations_manager'];
        $admins = User::whereHas('roles', function($q) use ($adminRoles) {
            $q->whereIn('name', $adminRoles);
        })->get();

        foreach ($expiringDocs as $doc) {
            $daysLeft = Carbon::parse($doc->expiry_date)->diffInDays(Carbon::now());
            
            // In a real scenario we'd dispatch a notification class.
            // Using NotificationService from phase 2 for now
            foreach ($admins as $admin) {
                $admin->notify(new \App\Notifications\SystemAlert(
                    'Document Expiring Soon',
                    "The document '{$doc->title}' ({$doc->doc_number}) is expiring on " . Carbon::parse($doc->expiry_date)->format('Y-m-d') . ".",
                    'warning',
                    '/documents/' . $doc->id
                ));
            }

            $this->info("Notified for document: {$doc->doc_number}");
        }

        $this->info('Done scanning expiring documents.');
    }
}
