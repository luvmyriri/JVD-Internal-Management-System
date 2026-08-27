<?php

namespace App\Exports;

use App\Models\EducationalTourPackage;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

/**
 * Export class for educational tour packages.
 */
class EducationalToursExport implements FromCollection, WithHeadings
{
    /**
     * Return a collection of data to be exported.
     */
    public function collection()
    {
        return EducationalTourPackage::all()->map(function (EducationalTourPackage $package) {
            return [
                $package->id,
                $package->name,
                $package->tour_code,
                $package->program_id,
                $package->school_customer_id,
                $package->starts_at,
                $package->ends_at,
                $package->status,
                $package->maximum_capacity,
                $package->image_path,
            ];
        });
    }

    /**
     * Define headings for the exported sheet.
     */
    public function headings(): array
    {
        return [
            'ID',
            'Name',
            'Tour Code',
            'Program ID',
            'School Customer ID',
            'Starts At',
            'Ends At',
            'Status',
            'Maximum Capacity',
            'Image Path',
        ];
    }
}
?>
