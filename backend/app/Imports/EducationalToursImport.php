<?php

namespace App\Imports;

use App\Models\EducationalTourPackage;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Import class for educational tour packages.
 * It creates new packages or updates existing ones based on the "ID" column.
 */
class EducationalToursImport implements ToModel, WithHeadingRow
{
    /**
     * @param array $row
     * @return \Illuminate\Database\Eloquent\Model|null
     */
    public function model(array $row)
    {
        // Assuming headings: ID, Name, Tour Code, Program ID, School Customer ID, Starts At, Ends At, Status, Maximum Capacity, Image Path
        $id = $row['id'] ?? null;
        $data = [
            'name' => $row['name'] ?? null,
            'tour_code' => $row['tour_code'] ?? null,
            'program_id' => $row['program_id'] ?? null,
            'school_customer_id' => $row['school_customer_id'] ?? null,
            'starts_at' => $row['starts_at'] ?? null,
            'ends_at' => $row['ends_at'] ?? null,
            'status' => $row['status'] ?? null,
            'maximum_capacity' => $row['maximum_capacity'] ?? null,
            'image_path' => $row['image_path'] ?? null,
        ];
        if ($id) {
            // Update existing package
            $package = EducationalTourPackage::find($id);
            if ($package) {
                $package->update($data);
                return $package;
            }
        }
        // Create new package
        return new EducationalTourPackage($data);
    }
}
?>
