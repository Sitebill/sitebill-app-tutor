<?php

namespace SitebillApps\Lumen\Tutor\Services;

use SitebillApps\Lumen\Tutor\Models\Setting;

/** Key/value settings of the office with defaults. The tenant scope comes from AppModel. */
final class Settings
{
    public const DEFAULTS = [
        'work_days' => '1,2,3,4,5,6',
        'work_from' => '09:00',
        'work_to' => '21:00',
        'default_price' => '1500',
        'default_duration' => '60',
        'holidays' => '',
        'tutor_name' => '',
    ];

    /** @return array<string, string> */
    public static function all(): array
    {
        return array_merge(self::DEFAULTS, Setting::query()->pluck('value', 'name')->map(fn ($v) => (string) $v)->all());
    }

    public static function save(array $values): void
    {
        foreach ($values as $name => $value) {
            if (! array_key_exists($name, self::DEFAULTS) || $value === null) {
                continue;
            }
            $row = Setting::query()->where('name', $name)->first() ?? new Setting(['name' => $name]);
            $row->value = (string) $value;
            $row->save();
        }
    }

    /** @return list<string> */
    public static function holidays(array $all): array
    {
        return array_values(array_filter(array_map('trim', explode(',', $all['holidays'] ?? ''))));
    }
}
