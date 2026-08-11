<?php

namespace Tests\Unit;

use App\Services\LocalTollRouteMatcher;
use Tests\TestCase;

class LocalTollRouteMatcherTest extends TestCase
{
    public function test_it_matches_route_geometry_to_local_class_2_entry_and_exit_nodes(): void
    {
        $result = app(LocalTollRouteMatcher::class)->estimate([
            [121.00044, 14.6793],
            [120.9395155, 14.8071119],
        ]);

        $this->assertNotNull($result);
        $this->assertSame('automatic_matrix', $result['mode']);
        $this->assertSame('JVD local Class 2 toll matrix', $result['provider']);
        $this->assertSame(263.0, $result['easytrip']);
        $this->assertSame(263.0, $result['total']);
        $this->assertSame('Balintawak', $result['segments'][0]['entry_point']);
        $this->assertSame('Bocaue', $result['segments'][0]['exit_point']);
        $this->assertSame('high', $result['confidence']);
    }

    public function test_it_does_not_guess_when_a_route_has_fewer_than_two_matching_nodes(): void
    {
        $result = app(LocalTollRouteMatcher::class)->estimate([
            [121.00044, 14.6793],
            [121.01, 14.68],
        ]);

        $this->assertNull($result);
    }
}
