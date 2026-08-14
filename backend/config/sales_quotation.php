<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Legacy tour-package quotation surcharges
    |--------------------------------------------------------------------------
    |
    | These rates were previously embedded in the quotation UI. Keeping them
    | server-side makes the saved quotation authoritative while retaining the
    | established prices for bus and coaster package extensions.
    |
    */
    'tour_extra_rates' => [
        'bus' => [
            'day' => 22010.00,
            'hour' => 1950.00,
        ],
        'coaster' => [
            'day' => 16780.00,
            'hour' => 1680.00,
        ],
    ],
];
