<?php

namespace SitebillApps\Lumen\Tutor\Services;

use Carbon\CarbonImmutable;
use SitebillApps\Lumen\Tutor\Models\Lesson;

/** Checks of a time slot: overlaps with other lessons, holidays, days off, working hours. Never writes. */
final class Schedule
{
    private const ACTIVE = ['planned', 'confirmed', 'done', 'no_show'];

    /** @return list<array{code: string, lesson_id: ?int, meta: ?string}> */
    public static function conflicts(string $date, string $time, int $duration, ?int $excludeId = null): array
    {
        $cfg = Settings::all();
        $out = [];
        $day = CarbonImmutable::parse($date);
        if (in_array($date, Settings::holidays($cfg), true)) {
            $out[] = ['code' => 'holiday', 'lesson_id' => null, 'meta' => $date];
        } elseif (! in_array((string) $day->dayOfWeekIso, explode(',', $cfg['work_days']), true)) {
            $out[] = ['code' => 'day_off', 'lesson_id' => null, 'meta' => (string) $day->dayOfWeekIso];
        }
        $start = self::minutes($time);
        $end = $start + $duration;
        if ($start < self::minutes($cfg['work_from']) || $end > self::minutes($cfg['work_to'])) {
            $out[] = ['code' => 'off_hours', 'lesson_id' => null, 'meta' => $cfg['work_from'] . '-' . $cfg['work_to']];
        }
        $others = Lesson::query()->whereDate('lesson_date', $date)->whereIn('status', self::ACTIVE)
            ->when($excludeId, fn ($q) => $q->where('id', '!=', $excludeId))->get();
        foreach ($others as $l) {
            $s = self::minutes(substr((string) $l->lesson_time, 0, 5));
            if ($start < $s + (int) $l->duration && $s < $end) {
                $out[] = ['code' => 'overlap', 'lesson_id' => (int) $l->id, 'meta' => substr((string) $l->lesson_time, 0, 5) . '|' . $l->duration];
            }
        }

        return $out;
    }

    /** Free start times (every 30 minutes) of the next days. @return list<array{date: string, time: string}> */
    public static function freeSlots(string $from, int $duration, int $days): array
    {
        $cfg = Settings::all();
        $workDays = explode(',', $cfg['work_days']);
        $holidays = Settings::holidays($cfg);
        $slots = [];
        for ($i = 0; $i < $days; $i++) {
            $day = CarbonImmutable::parse($from)->addDays($i);
            $date = $day->toDateString();
            if (in_array($date, $holidays, true) || ! in_array((string) $day->dayOfWeekIso, $workDays, true)) {
                continue;
            }
            $busy = Lesson::query()->whereDate('lesson_date', $date)->whereIn('status', self::ACTIVE)->get()
                ->map(function ($l) {
                    $s = self::minutes(substr((string) $l->lesson_time, 0, 5));

                    return [$s, $s + (int) $l->duration];
                })->all();
            for ($m = self::minutes($cfg['work_from']); $m + $duration <= self::minutes($cfg['work_to']); $m += 30) {
                $free = true;
                foreach ($busy as [$bs, $be]) {
                    if ($m < $be && $bs < $m + $duration) {
                        $free = false;
                        break;
                    }
                }
                if ($free) {
                    $slots[] = ['date' => $date, 'time' => sprintf('%02d:%02d', intdiv($m, 60), $m % 60)];
                }
            }
        }

        return $slots;
    }

    public static function minutes(string $hhmm): int
    {
        $p = explode(':', $hhmm);

        return ((int) ($p[0] ?? 0)) * 60 + (int) ($p[1] ?? 0);
    }
}
