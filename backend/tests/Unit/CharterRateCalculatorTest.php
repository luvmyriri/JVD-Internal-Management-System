<?php

namespace Tests\Unit;

use App\Services\CharterRateCalculator;
use PHPUnit\Framework\TestCase;

class CharterRateCalculatorTest extends TestCase
{
    public function test_it_calculates_fuel_cost_and_preserves_a_profitable_entered_rate(): void
    {
        $result = (new CharterRateCalculator)->calculate([
            'base_price' => 30000,
            'garage_distance_km' => 10,
            'route_distance_km' => 240,
            'fuel_efficiency_km_per_liter' => 2.5,
            'diesel_price_per_liter' => 60,
            'driver_meals' => 1500,
            'toll_gate_fees' => 1000,
            'easytrip' => 500,
            'autosweep' => 500,
            'commission' => 3000,
            'desired_profit' => 12000,
            'auto_adjust_rate' => true,
        ]);

        $this->assertSame(250.0, $result['total_distance_km']);
        $this->assertSame(100.0, $result['estimated_liters']);
        $this->assertSame(6000.0, $result['diesel_cost']);
        $this->assertSame(12500.0, $result['total_expenses']);
        $this->assertSame(30000.0, $result['base_price']);
        $this->assertSame(17500.0, $result['projected_profit']);
    }

    public function test_it_raises_the_rate_to_lock_the_desired_profit(): void
    {
        $result = (new CharterRateCalculator)->calculate([
            'base_price' => 20000,
            'total_distance_km' => 250,
            'fuel_efficiency_km_per_liter' => 2.5,
            'diesel_price_per_liter' => 60,
            'driver_meals' => 1500,
            'toll_gate_fees' => 1000,
            'easytrip' => 500,
            'autosweep' => 500,
            'commission' => 3000,
            'desired_profit' => 12000,
            'auto_adjust_rate' => true,
        ]);

        $this->assertSame(24500.0, $result['base_price']);
        $this->assertSame(12000.0, $result['projected_profit']);
    }

    public function test_manual_liters_and_diesel_cost_are_respected(): void
    {
        $result = (new CharterRateCalculator)->calculate([
            'base_price' => 30000,
            'total_distance_km' => 250,
            'fuel_efficiency_km_per_liter' => 2.5,
            'estimated_liters' => 120,
            'diesel_price_per_liter' => 60,
            'diesel_cost' => 7000,
            'desired_profit' => 12000,
        ]);

        $this->assertSame(120.0, $result['estimated_liters']);
        $this->assertSame(7000.0, $result['diesel_cost']);
    }
}
