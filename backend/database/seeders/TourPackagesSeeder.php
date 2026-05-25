<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class TourPackagesSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Add Printing Services
        Service::firstOrCreate(
            ['name' => 'Printing Services'],
            [
                'description' => 'Various printing services including documents, photos, and promotional materials.',
                'category' => 'Printing Services',
                'price' => 0.00,
                'is_active' => true,
                'has_booking_fields' => false,
            ]
        );

        // 2. Add Tours & Travels Packages
        $tours = [
            // METRO MANILA
            ['name' => 'CITY TOUR', 'tour_kms' => 45, 'tour_hours' => 5, 'bus_price' => 12100.00, 'coaster_price' => 8960.00],
            ['name' => 'NOVALICHES / FAIRVIEW / PAYATAS', 'tour_kms' => 86, 'tour_hours' => 7, 'bus_price' => 15100.00, 'coaster_price' => 10700.00],
            
            // BULACAN
            ['name' => 'MEYCAUAYAN / SAN JOSE DEL MONTE / MARILAO / BOCAUE', 'tour_kms' => 104, 'tour_hours' => 8, 'bus_price' => 15900.00, 'coaster_price' => 11850.00],
            ['name' => 'MALOLOS / PAOMBONG / PLARIDEL / BALAGTAS / GUIGUINTO', 'tour_kms' => 112, 'tour_hours' => 8, 'bus_price' => 16335.00, 'coaster_price' => 12020.00],
            ['name' => 'HAGONOY / CALUMPIT / PULILAN', 'tour_kms' => 130, 'tour_hours' => 9, 'bus_price' => 17250.00, 'coaster_price' => 12480.00],
            ['name' => 'SAN ILDEFONSO / SAN MIGUEL / BIAK NA BATO / BALIUAG', 'tour_kms' => 172, 'tour_hours' => 12, 'bus_price' => 21520.00, 'coaster_price' => 15310.00],
            ['name' => 'DOÑA REMEDIOS TRINIDAD (DRT)', 'tour_kms' => 180, 'tour_hours' => 12, 'bus_price' => 22650.00, 'coaster_price' => 15310.00],

            // RIZAL
            ['name' => 'ANTIPOLO / CAINTA / TAYTAY / ANGONO / SAN MATEO / MONTALBAN', 'tour_kms' => 104, 'tour_hours' => 8, 'bus_price' => 15900.00, 'coaster_price' => 11850.00],
            ['name' => 'BARAS / CARDONA / MORONG / BINANGONAN', 'tour_kms' => 114, 'tour_hours' => 9, 'bus_price' => 17250.00, 'coaster_price' => 12480.00],
            ['name' => 'PILILIA / TANAY / TERESA', 'tour_kms' => 132, 'tour_hours' => 10, 'bus_price' => 19050.00, 'coaster_price' => 13350.00],
            ['name' => 'LAKE ISLAND RESORT', 'tour_kms' => 152, 'tour_hours' => 10, 'bus_price' => 21520.00, 'coaster_price' => 16500.00],

            // CAVITE
            ['name' => 'BACOOR / KAWIT / CAVITE CITY / ROSARIO / NOVELETA / IMUS', 'tour_kms' => 104, 'tour_hours' => 8, 'bus_price' => 15900.00, 'coaster_price' => 11850.00],
            ['name' => 'DASMARIÑAS / CARMONA / GMA', 'tour_kms' => 120, 'tour_hours' => 9, 'bus_price' => 17250.00, 'coaster_price' => 12480.00],
            ['name' => 'SILANG / TRECE MARTIRES / GEN TRIAS / TANZA / NAIC / TERNATE', 'tour_kms' => 138, 'tour_hours' => 10, 'bus_price' => 19050.00, 'coaster_price' => 13350.00],
            ['name' => 'TAGAYTAY CITY', 'tour_kms' => 150, 'tour_hours' => 12, 'bus_price' => 21520.00, 'coaster_price' => 15310.00],
            ['name' => 'MARAGONDON', 'tour_kms' => 174, 'tour_hours' => 12, 'bus_price' => 22650.00, 'coaster_price' => 15310.00],

            // LAGUNA
            ['name' => 'SAN PEDRO / BIÑAN / STA ROSA', 'tour_kms' => 110, 'tour_hours' => 8, 'bus_price' => 16335.00, 'coaster_price' => 12020.00],
            ['name' => 'CABUYAO / CALAMBA (PANSOL, LOS BAÑOS)', 'tour_kms' => 134, 'tour_hours' => 10, 'bus_price' => 19050.00, 'coaster_price' => 13350.00],
            ['name' => 'SAN PABLO / ALAMINOS / CALAUAN / VICTORIA / BAY', 'tour_kms' => 198, 'tour_hours' => 14, 'bus_price' => 23800.00, 'coaster_price' => 17110.00],
            ['name' => 'SANTA CRUZ / PILA / LILIW / NAGCARLAN', 'tour_kms' => 202, 'tour_hours' => 14, 'bus_price' => 23800.00, 'coaster_price' => 17110.00],
            ['name' => 'MAJAYJAY / MAGDALENA / LUISIANA / CALIRAYA / PAETE', 'tour_kms' => 236, 'tour_hours' => 16, 'bus_price' => 27200.00, 'coaster_price' => 19750.00],
            ['name' => 'PAGSANJAN', 'tour_kms' => 250, 'tour_hours' => 18, 'bus_price' => 28300.00, 'coaster_price' => 20630.00],
            
            // BATANGAS
            ['name' => 'STO TOMAS / TANAUAN / MALVAR / LIPA', 'tour_kms' => 168, 'tour_hours' => 12, 'bus_price' => 21520.00, 'coaster_price' => 15310.00],
            ['name' => 'CUENCA / SAN JOSE / BATANGAS CITY / BAUAN / MABINI / SAN JUAN (LAIYA) / ANILAO / CALATAGAN / LOBO', 'tour_kms' => 274, 'tour_hours' => 20, 'bus_price' => 30550.00, 'coaster_price' => 22400.00],
            ['name' => 'NASUGBU / MATABUNGKAY / LIAN', 'tour_kms' => 220, 'tour_hours' => 16, 'bus_price' => 26050.00, 'coaster_price' => 18880.00],

            // QUEZON
            ['name' => 'TIAONG / CANDELARIA', 'tour_kms' => 212, 'tour_hours' => 16, 'bus_price' => 26050.00, 'coaster_price' => 18880.00],
            ['name' => 'LUCENA / TAYABAS / LUCBAN', 'tour_kms' => 264, 'tour_hours' => 20, 'bus_price' => 30550.00, 'coaster_price' => 22400.00],
            ['name' => 'MAUBAN / ATIMONAN', 'tour_kms' => 324, 'tour_hours' => 24, 'bus_price' => 34000.00, 'coaster_price' => 25950.00],

            // PAMPANGA
            ['name' => 'APALIT / SAN SIMON', 'tour_kms' => 122, 'tour_hours' => 8, 'bus_price' => 17250.00, 'coaster_price' => 12480.00],
            ['name' => 'SAN FERNANDO / MEXICO', 'tour_kms' => 140, 'tour_hours' => 10, 'bus_price' => 19050.00, 'coaster_price' => 13350.00],
            ['name' => 'CLARK / ANGELES / DAU / ARAYAT', 'tour_kms' => 186, 'tour_hours' => 14, 'bus_price' => 23800.00, 'coaster_price' => 17110.00],

            // BATAAN
            ['name' => 'DINALUPIHAN / HERMOSA / ORANI', 'tour_kms' => 222, 'tour_hours' => 16, 'bus_price' => 26050.00, 'coaster_price' => 18880.00],
            ['name' => 'BALANGA / PILAR / ORION / LIMAY', 'tour_kms' => 266, 'tour_hours' => 20, 'bus_price' => 30550.00, 'coaster_price' => 22400.00],
            ['name' => 'MARIVELES', 'tour_kms' => 320, 'tour_hours' => 24, 'bus_price' => 34000.00, 'coaster_price' => 25950.00],
            ['name' => 'MORONG / BAGAC', 'tour_kms' => 304, 'tour_hours' => 22, 'bus_price' => 31650.00, 'coaster_price' => 24200.00],

            // ZAMBALES
            ['name' => 'OLONGAPO / SUBIC', 'tour_kms' => 258, 'tour_hours' => 20, 'bus_price' => 30550.00, 'coaster_price' => 22400.00],
            ['name' => 'SAN ANTONIO / PUNDAQUIT', 'tour_kms' => 312, 'tour_hours' => 24, 'bus_price' => 34000.00, 'coaster_price' => 25950.00],
            ['name' => 'IBA / BOTOLAN', 'tour_kms' => 418, 'tour_hours' => 30, 'bus_price' => 41900.00, 'coaster_price' => 33020.00],
        ];

        foreach ($tours as $tour) {
            Service::firstOrCreate(
                ['name' => $tour['name'], 'category' => 'Tours & Travels'],
                [
                    'description' => 'Tour package for ' . $tour['name'],
                    'price' => $tour['bus_price'], // Default base price is bus
                    'is_tour' => true,
                    'tour_kms' => $tour['tour_kms'],
                    'tour_hours' => $tour['tour_hours'],
                    'bus_price' => $tour['bus_price'],
                    'coaster_price' => $tour['coaster_price'],
                    'is_active' => true,
                    'has_booking_fields' => false,
                ]
            );
        }
    }
}
