<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $fillable = ['key', 'value'];

    /**
     * Get a setting value by key.
     *
     * @param string $key
     * @param mixed $default
     * @return mixed
     */
    public static function getValue(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        if (!$setting) {
            return $default;
        }

        // Check if value is a JSON string (like landing_page_bg array)
        $decoded = json_decode($setting->value, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return $setting->value;
    }

    /**
     * Set a setting value by key.
     *
     * @param string $key
     * @param mixed $value
     * @return \App\Models\SystemSetting
     */
    public static function setValue(string $key, $value)
    {
        $encodedValue = is_array($value) ? json_encode($value) : $value;
        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $encodedValue]
        );
    }
}
