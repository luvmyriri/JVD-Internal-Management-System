<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class SyncTollMatrix extends Command
{
    protected $signature = 'tolls:sync-matrix {--url= : Override the configured source URL}';

    protected $description = 'Download and store the published Vehicle Class 2 toll matrix used by bus charters';

    public function handle(): int
    {
        $url = (string) ($this->option('url') ?: config('services.toll_matrix.source_url'));
        $target = (string) config('services.toll_matrix.data_file');

        try {
            $html = Http::accept('text/html')->timeout(45)->get($url)->throw()->body();
            $payload = $this->decodePageData($html);
            $matrix = $payload[1]['data']['tollMatrix'] ?? null;
            if (! is_array($matrix)) {
                throw new RuntimeException('The page did not contain a tollMatrix dataset.');
            }

            $rates = collect($matrix)
                ->filter(fn (mixed $row) => is_array($row) && (int) data_get($row, 'toll_matrix.vehicleClass') === 2)
                ->map(fn (array $row) => $this->normalizeRate($row))
                ->filter()
                ->unique(fn (array $row) => $row['entry_point_id'].'-'.$row['exit_point_id'].'-'.$row['network_id'])
                ->sortBy(fn (array $row) => sprintf('%s-%05d-%05d', $row['network_id'], $row['entry_sequence'], $row['exit_sequence']))
                ->values()
                ->all();

            if ($rates === []) {
                throw new RuntimeException('No Vehicle Class 2 rates were found.');
            }

            $document = [
                'schema_version' => 1,
                'vehicle_class' => 2,
                'vehicle_description' => 'Bus / truck',
                'source_name' => 'toll.ph published toll matrix',
                'source_url' => $url,
                'official_verification_url' => config('services.toll_regulatory_board.rates_url'),
                'synced_at' => now()->toIso8601String(),
                'rates' => $rates,
            ];

            if (! is_dir(dirname($target))) {
                mkdir(dirname($target), 0755, true);
            }
            file_put_contents($target, json_encode($document, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE).PHP_EOL);
            $this->info(sprintf('Stored %d Vehicle Class 2 toll rates in %s.', count($rates), $target));

            return self::SUCCESS;
        } catch (\Throwable $exception) {
            $this->error('Toll matrix sync failed: '.$exception->getMessage());

            return self::FAILURE;
        }
    }

    /** @return array<mixed> */
    public function decodePageData(string $html): array
    {
        $marker = 'const data = ';
        $start = strpos($html, $marker);
        if ($start === false) {
            throw new RuntimeException('Could not locate the embedded page data.');
        }

        $literal = $this->balancedArray(substr($html, $start + strlen($marker)));
        $json = $this->quoteObjectKeys($literal);
        $decoded = json_decode($json, true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($decoded)) {
            throw new RuntimeException('Embedded page data was not an array.');
        }

        return $decoded;
    }

    private function balancedArray(string $input): string
    {
        $depth = 0;
        $inString = false;
        $escaped = false;
        $started = false;
        $length = strlen($input);

        for ($index = 0; $index < $length; $index++) {
            $character = $input[$index];
            if ($inString) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($character === '\\') {
                    $escaped = true;
                } elseif ($character === '"') {
                    $inString = false;
                }

                continue;
            }
            if ($character === '"') {
                $inString = true;
            } elseif ($character === '[') {
                $started = true;
                $depth++;
            } elseif ($character === ']') {
                $depth--;
                if ($started && $depth === 0) {
                    return substr($input, 0, $index + 1);
                }
            }
        }

        throw new RuntimeException('Embedded page data was incomplete.');
    }

    private function quoteObjectKeys(string $literal): string
    {
        return preg_replace('/(?<=[{,])([A-Za-z_$][A-Za-z0-9_$]*)(?=\s*:)/', '"$1"', $literal)
            ?? throw new RuntimeException('Could not normalize embedded page data.');
    }

    /** @return array<string, mixed>|null */
    private function normalizeRate(array $row): ?array
    {
        $rate = $row['toll_matrix'] ?? null;
        $entry = $row['entryPoint'] ?? null;
        $exit = $row['exitPoint'] ?? null;
        $entryExpressway = $row['entryExpressway'] ?? null;
        $exitExpressway = $row['exitExpressway'] ?? null;
        if (! is_array($rate) || ! is_array($entry) || ! is_array($exit) || ! is_array($entryExpressway) || ! is_array($exitExpressway)) {
            return null;
        }

        return [
            'network_id' => (string) $entryExpressway['tollNetworkId'],
            'entry_point_id' => (int) $entry['id'],
            'entry_point' => (string) $entry['name'],
            'entry_expressway_id' => (string) $entryExpressway['id'],
            'entry_expressway' => (string) $entryExpressway['name'],
            'entry_sequence' => (int) $entry['sequence'],
            'exit_point_id' => (int) $exit['id'],
            'exit_point' => (string) $exit['name'],
            'exit_expressway_id' => (string) $exitExpressway['id'],
            'exit_expressway' => (string) $exitExpressway['name'],
            'exit_sequence' => (int) $exit['sequence'],
            'fee' => round((float) $rate['fee'], 2),
            'reversible' => (bool) $rate['reversible'],
        ];
    }
}
