<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class DeploymentReadiness extends Command
{
    protected $signature = 'deployment:readiness {--production : Enforce production-only controls}';

    protected $description = 'Fail closed when environment, database, migrations, payment, queue, or storage prerequisites are incomplete';

    public function handle(): int
    {
        $production = (bool) $this->option('production');
        $payMongoKey = (string) config('services.paymongo.secret_key');
        $checks = [];
        $checks['APP_KEY configured'] = filled(config('app.key'));
        $checks['Database reachable'] = $this->attempt(fn () => DB::select('SELECT 1'));
        Artisan::call('migrate:status');
        $checks['No pending migrations'] = ! str_contains(Artisan::output(), 'Pending');
        $checks['Storage writable'] = is_writable(storage_path('framework')) && is_writable(storage_path('logs'));
        $checks[$production ? 'PayMongo live key configured' : 'PayMongo test/live key configured'] = $production
            ? str_starts_with($payMongoKey, 'sk_live_')
            : filled($payMongoKey);
        $checks['PayMongo webhook signing configured'] = filled(config('services.paymongo.webhook_secret'));

        if ($production) {
            $checks['APP_ENV is production'] = app()->environment('production');
            $checks['APP_DEBUG disabled'] = config('app.debug') === false;
            $checks['PostgreSQL selected'] = config('database.default') === 'pgsql';
            $checks['HTTPS application URL'] = str_starts_with((string) config('app.url'), 'https://');
            $checks['Non-sync queue'] = config('queue.default') !== 'sync';
        }

        foreach ($checks as $label => $ok) {
            $this->{$ok ? 'info' : 'error'}(($ok ? 'PASS ' : 'FAIL ').$label);
        }

        $failed = array_filter($checks, fn ($ok) => ! $ok);
        $this->newLine();
        $this->line(count($failed) ? count($failed).' readiness checks failed.' : 'All deployment readiness checks passed.');

        return count($failed) ? self::FAILURE : self::SUCCESS;
    }

    private function attempt(callable $callback): bool
    {
        try {
            $callback();

            return true;
        } catch (\Throwable) {
            return false;
        }
    }
}
