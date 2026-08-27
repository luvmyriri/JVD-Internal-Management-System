<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

return new class extends Migration
{
    public function up(): void
    {
        // Earlier uploads used the private local disk with a `public/` prefix.
        // Copy those files into the real public disk so existing packages recover
        // without requiring staff to upload their images again.
        $legacyDirectory = storage_path('app/private/public/educational-tour-images');
        $publicDirectory = storage_path('app/public/educational-tour-images');

        if (! app()->environment('testing') && File::isDirectory($legacyDirectory)) {
            File::ensureDirectoryExists($publicDirectory);

            foreach (File::files($legacyDirectory) as $legacyFile) {
                $destination = $publicDirectory.DIRECTORY_SEPARATOR.$legacyFile->getFilename();
                if (! File::exists($destination)) {
                    File::copy($legacyFile->getPathname(), $destination);
                }
            }
        }

        DB::table('educational_tour_packages')
            ->whereNotNull('images')
            ->orderBy('id')
            ->eachById(function (object $package): void {
                $images = json_decode((string) $package->images, true);
                if (! is_array($images)) {
                    return;
                }

                $normalized = array_map(function ($image) {
                    if (! is_string($image)) {
                        return $image;
                    }

                    $image = str_replace('/storage/public/', '/storage/', $image);
                    if (str_starts_with($image, 'public/')) {
                        return '/storage/'.substr($image, strlen('public/'));
                    }

                    return $image;
                }, $images);

                if ($normalized !== $images) {
                    DB::table('educational_tour_packages')
                        ->where('id', $package->id)
                        ->update(['images' => json_encode($normalized)]);
                }
            });
    }

    public function down(): void
    {
        // Intentionally non-destructive: repaired public files remain usable.
    }
};
