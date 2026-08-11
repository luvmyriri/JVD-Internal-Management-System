<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ApiErrorSanitizationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::middleware('api')->get('/api/v1/testing/unhandled-database-error', function () {
            throw new \RuntimeException('SQLSTATE[22P02]: Invalid text representation (Connection: pgsql, SQL: insert into invoices values (...))');
        });

        Route::middleware('api')->get('/api/v1/testing/caught-database-error', function () {
            return response()->json([
                'message' => 'SQLSTATE[23505]: duplicate key value violates unique constraint',
                'exception' => 'Illuminate\\Database\\QueryException',
            ], 422);
        });

        Route::middleware('api')->get('/api/v1/testing/safe-validation-error', function () {
            return response()->json([
                'message' => 'The submitted information is invalid.',
                'errors' => ['bus_id' => ['Select a fleet bus before checkout.']],
            ], 422);
        });
    }

    public function test_unhandled_database_exception_never_exposes_internal_details(): void
    {
        $response = $this->getJson('/api/v1/testing/unhandled-database-error')
            ->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['message', 'error_reference']);

        $content = $response->getContent();
        $this->assertStringNotContainsString('SQLSTATE', $content);
        $this->assertStringNotContainsString('pgsql', $content);
        $this->assertStringNotContainsString('insert into', $content);
        $this->assertMatchesRegularExpression('/^ERR-[A-Z0-9]{10}$/', $response->json('error_reference'));
    }

    public function test_caught_database_error_response_is_also_sanitized(): void
    {
        $response = $this->getJson('/api/v1/testing/caught-database-error')
            ->assertStatus(500)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['message', 'error_reference']);

        $this->assertStringNotContainsString('SQLSTATE', $response->getContent());
        $this->assertStringNotContainsString('QueryException', $response->getContent());
    }

    public function test_safe_validation_guidance_remains_actionable(): void
    {
        $this->getJson('/api/v1/testing/safe-validation-error')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The submitted information is invalid.')
            ->assertJsonPath('errors.bus_id.0', 'Select a fleet bus before checkout.')
            ->assertJsonMissingPath('error_reference');
    }
}
