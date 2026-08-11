<?php

namespace Tests\Unit;

use App\Console\Commands\SyncTollMatrix;
use App\Services\TollMatrixService;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class TollMatrixServiceTest extends TestCase
{
    public function test_sync_parser_reads_the_embedded_javascript_object_literal_without_executing_it(): void
    {
        $html = '<script>const data = [null,{"type":"data","data":{tollMatrix:[{toll_matrix:{entryPointId:1,exitPointId:2,fee:"76.00",reversible:true,vehicleClass:2}}]}}]; const uses = {};</script>';

        $decoded = app(SyncTollMatrix::class)->decodePageData($html);

        $this->assertSame('76.00', $decoded[1]['data']['tollMatrix'][0]['toll_matrix']['fee']);
        $this->assertTrue($decoded[1]['data']['tollMatrix'][0]['toll_matrix']['reversible']);
    }

    public function test_it_calculates_reversible_class_2_segments_and_assigns_the_correct_rfid(): void
    {
        $service = app(TollMatrixService::class);

        $forward = $service->calculate([[
            'network_id' => 'TPLEX',
            'entry_point_id' => 88,
            'exit_point_id' => 89,
        ]]);
        $reverse = $service->calculate([[
            'network_id' => 'TPLEX',
            'entry_point_id' => 89,
            'exit_point_id' => 88,
        ]]);

        $this->assertSame(76.0, $forward['autosweep']);
        $this->assertSame(76.0, $forward['total']);
        $this->assertSame('La Paz', $forward['segments'][0]['entry_point']);
        $this->assertSame(76.0, $reverse['total']);
        $this->assertSame('Victoria', $reverse['segments'][0]['entry_point']);
    }

    public function test_it_rejects_an_unpublished_entry_exit_pair(): void
    {
        $this->expectException(ValidationException::class);

        app(TollMatrixService::class)->calculate([[
            'network_id' => 'TPLEX',
            'entry_point_id' => 88,
            'exit_point_id' => 999999,
        ]]);
    }

    public function test_catalog_contains_all_published_toll_networks(): void
    {
        $catalog = app(TollMatrixService::class)->catalog();

        $this->assertSame(2, $catalog['vehicle_class']);
        $this->assertCount(10, $catalog['networks']);
        $this->assertContains('NLEX_SCTEX', array_column($catalog['networks'], 'id'));
        $this->assertContains('SLEX_SKYWAY_MCX', array_column($catalog['networks'], 'id'));
    }
}
