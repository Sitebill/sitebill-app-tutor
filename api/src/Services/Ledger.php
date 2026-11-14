<?php

namespace SitebillApps\Lumen\Tutor\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use SitebillApps\Lumen\Tutor\Models\Lesson;
use SitebillApps\Lumen\Tutor\Models\Payment;

/**
 * Lessons and money per student, calculated from the rows (nothing is stored twice).
 * A lesson is charged when it took place (done) or the student did not come (no_show).
 */
final class Ledger
{
    public const CHARGED = ['done', 'no_show'];
    public const UPCOMING = ['planned', 'confirmed'];

    /** @return array<int, array<string, mixed>> keyed by student id */
    public static function stats(CarbonImmutable $today, ?Collection $lessons = null): array
    {
        $lessons ??= Lesson::query()->get(['id', 'student_id', 'lesson_date', 'lesson_time', 'price', 'status']);
        $payments = Payment::query()->get(['student_id', 'amount', 'lessons_count'])->groupBy('student_id');
        $byLesson = [];
        foreach ($lessons->groupBy('student_id') as $sid => $list) {
            $charged = $list->filter(fn ($l) => in_array($l->status, self::CHARGED, true));
            $upcoming = $list->filter(fn ($l) => in_array($l->status, self::UPCOMING, true) && self::dateOf($l) >= $today->toDateString())
                ->sortBy(fn ($l) => self::dateOf($l) . ' ' . substr((string) $l->lesson_time, 0, 5))->first();
            $done = $list->where('status', 'done');
            $byLesson[(int) $sid] = [
                'lessons_done' => $done->count(),
                'charged_sum' => (float) $charged->sum('price'),
                'next_lesson_date' => $upcoming ? self::dateOf($upcoming) : null,
                'next_lesson_time' => $upcoming ? substr((string) $upcoming->lesson_time, 0, 5) : null,
                'last_lesson_date' => $done->map(fn ($l) => self::dateOf($l))->max(),
            ];
        }
        $result = [];
        foreach (array_unique([...array_keys($byLesson), ...$payments->keys()->map(fn ($k) => (int) $k)->all()]) as $sid) {
            $base = $byLesson[$sid] ?? ['lessons_done' => 0, 'charged_sum' => 0.0, 'next_lesson_date' => null, 'next_lesson_time' => null, 'last_lesson_date' => null];
            $paid = (float) ($payments->get($sid)?->sum('amount') ?? 0);
            $balance = round($paid - $base['charged_sum'], 2);
            $result[(int) $sid] = [
                'lessons_done' => $base['lessons_done'],
                'lessons_paid' => (int) ($payments->get($sid)?->sum('lessons_count') ?? 0),
                'balance' => $balance,
                'debt' => $balance < 0 ? -$balance : 0.0,
                'next_lesson_date' => $base['next_lesson_date'],
                'next_lesson_time' => $base['next_lesson_time'],
                'last_lesson_date' => $base['last_lesson_date'],
            ];
        }

        return $result;
    }

    public static function dateOf(Lesson $l): string
    {
        return substr((string) $l->getRawOriginal('lesson_date'), 0, 10);
    }
}
