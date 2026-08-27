<?php

namespace App\Services;

use App\Imports\EducationalToursImport;
use Maatwebsite\Excel\Excel as ExcelEnum;

/**
 * Service to import educational tour packages from an Excel file.
 */
class ExcelImportService
{
    /**
     * Import educational tours from the given uploaded file.
     *
     * @param \Illuminate\Http\UploadedFile $file
     * @return void
     */
    public function importEducationalTours(\Illuminate\Http\UploadedFile $file): void
    {
        \Excel::import(new EducationalToursImport(), $file, null, ExcelEnum::XLSX);
    }
}
?>
