<?php

namespace App\Services;

class CharterRateCalculator
{
    public function calculate(array $data): array
    {
        $garageDistance = $this->number($data, 'garage_distance_km');
        $routeDistance = $this->number($data, 'route_distance_km');
        $totalDistance = array_key_exists('total_distance_km', $data)
            ? $this->number($data, 'total_distance_km')
            : $garageDistance + $routeDistance;
        $efficiency = max($this->number($data, 'fuel_efficiency_km_per_liter', 2.5), 0.01);
        $liters = array_key_exists('estimated_liters', $data)
            ? $this->number($data, 'estimated_liters')
            : $totalDistance / $efficiency;
        $dieselPrice = $this->number($data, 'diesel_price_per_liter');
        $dieselCost = array_key_exists('diesel_cost', $data)
            ? $this->number($data, 'diesel_cost')
            : $liters * $dieselPrice;

        $expenses = $dieselCost
            + $this->number($data, 'driver_meals')
            + $this->number($data, 'toll_gate_fees')
            + $this->number($data, 'easytrip')
            + $this->number($data, 'autosweep')
            + $this->number($data, 'commission');
        $desiredProfit = $this->number($data, 'desired_profit');
        $enteredRate = $this->number($data, 'base_price');
        $recommendedRate = $expenses + $desiredProfit;
        $effectiveRate = ($data['auto_adjust_rate'] ?? true)
            ? max($enteredRate, $recommendedRate)
            : $enteredRate;

        return [
            'garage_distance_km' => round($garageDistance, 2),
            'route_distance_km' => round($routeDistance, 2),
            'total_distance_km' => round($totalDistance, 2),
            'fuel_efficiency_km_per_liter' => round($efficiency, 2),
            'estimated_liters' => round($liters, 2),
            'diesel_price_per_liter' => round($dieselPrice, 2),
            'diesel_cost' => round($dieselCost, 2),
            'total_expenses' => round($expenses, 2),
            'desired_profit' => round($desiredProfit, 2),
            'base_price' => round($effectiveRate, 2),
            'projected_profit' => round($effectiveRate - $expenses, 2),
            'recommended_base_price' => round($recommendedRate, 2),
        ];
    }

    private function number(array $data, string $key, float $default = 0): float
    {
        return isset($data[$key]) && is_numeric($data[$key]) ? max((float) $data[$key], 0) : $default;
    }
}
