<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Sentry DSN
    |--------------------------------------------------------------------------
    |
    | The DSN (Data Source Name) tells Sentry where to send the events.
    |
    */

    'dsn' => env('SENTRY_LARAVEL_DSN', env('SENTRY_DSN')),

    /*
    |--------------------------------------------------------------------------
    | Sentry Environment
    |--------------------------------------------------------------------------
    |
    | Tells Sentry which environment the application is running in.
    |
    */

    'environment' => env('APP_ENV', 'production'),

    /*
    |--------------------------------------------------------------------------
    | Send exceptions
    |--------------------------------------------------------------------------
    |
    */
    
    'breadcrumbs' => [
        'logs' => true,
        'sql_queries' => true,
        'sql_bindings' => true,
        'queue_info' => true,
        'command_info' => true,
        'auth' => true,
    ],

    'tracing' => [
        'queue_job_transactions' => env('SENTRY_TRACE_QUEUE_JOBS', false),
        'queue_jobs' => true,
        'sql_queries' => true,
        'sql_origin' => true,
        'views' => true,
        'livewire' => true,
        'http_client' => true,
        'redis' => true,
        'cache' => true,
    ],

    'send_default_pii' => env('SENTRY_SEND_DEFAULT_PII', false),

    'traces_sample_rate' => env('SENTRY_TRACES_SAMPLE_RATE', 1.0),

];
