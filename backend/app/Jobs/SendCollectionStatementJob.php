<?php

namespace App\Jobs;

use App\Mail\CollectionStatementMail;
use App\Models\Collection;
use App\Services\CustomerMailTransport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use RuntimeException;

class SendCollectionStatementJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 120;

    /** @var array<int, int> */
    public array $backoff = [10, 30, 60];

    public function __construct(
        public readonly int $collectionId,
        public readonly string $recipient,
    ) {
        $this->onQueue('mail');
    }

    public function handle(): void
    {
        $collection = Collection::with(['invoice', 'customer', 'payments'])->find($this->collectionId);
        if (! $collection) {
            throw new RuntimeException("Collection {$this->collectionId} no longer exists.");
        }

        Mail::mailer(app(CustomerMailTransport::class)->mailerName())
            ->to($this->recipient)
            ->sendNow(new CollectionStatementMail($collection));
    }
}
