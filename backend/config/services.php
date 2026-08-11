<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'paymongo' => [
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
        'public_key' => env('PAYMONGO_PUBLIC_KEY'),
        'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET'),
    ],

    'maps' => [
        'google_geocoding_key' => env('GOOGLE_MAPS_API_KEY'),
        'geocoder_url' => env('LOCATION_GEOCODER_URL', 'https://nominatim.openstreetmap.org'),
        'router_url' => env('ROUTING_API_URL', 'https://router.project-osrm.org'),
        'user_agent' => env('LOCATION_API_USER_AGENT', 'JVD-Internal-Management-System/1.0'),
        'garage_location' => env('JVD_GARAGE_LOCATION', 'Unit 6 Aryanna Village Center, Barangay 175, Susano Road, Camarin, Caloocan, 1400 Metro Manila'),
        'garage_latitude' => env('JVD_GARAGE_LATITUDE', 14.756338137188132),
        'garage_longitude' => env('JVD_GARAGE_LONGITUDE', 121.04179034232897),
    ],

    'toll_regulatory_board' => [
        'rates_url' => env('TRB_TOLL_RATES_URL', 'https://trb.gov.ph/index.php'),
    ],

    'toll_matrix' => [
        'source_url' => env('TOLL_MATRIX_SOURCE_URL', 'https://toll.ph/matrix'),
        'data_file' => resource_path('data/toll-matrix-class-2.json'),
        'node_file' => resource_path('data/toll-node-coordinates.json'),
    ],

    'tollguru' => [
        'api_key' => env('TOLLGURU_API_KEY'),
        'base_url' => env('TOLLGURU_BASE_URL', 'https://apis.tollguru.com/toll/v2'),
        'map_provider' => env('TOLLGURU_MAP_PROVIDER', 'here'),
        'bus_vehicle_type' => env('TOLLGURU_BUS_VEHICLE_TYPE', '2AxlesBus'),
    ],

    'psgc' => [
        'token' => env('PSGC_API_TOKEN'),
        'base_url' => env('PSGC_BASE_URL', 'https://classification.psa.gov.ph/psgc'),
        'version' => env('PSGC_VERSION', 'Q2_2024'),
    ],

];
