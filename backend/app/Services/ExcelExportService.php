<?php

namespace App\Services;

use App\Exports\EducationalToursExport;
use Maatwebsite\Excel\Excel as ExcelEnum;

/**
 * Service to export educational tour packages to an Excel file.
 */
class ExcelExportService
{
    /**
     * Export educational tours as a raw XLSX binary string.
     *
     * @return string
     */
    public function exportEducationalTours(): string
    {
        // Generate a raw XLSX binary string using the Export class.
        return \Excel::raw(new EducationalToursExport(), ExcelEnum::XLSX);
    }
}
?>