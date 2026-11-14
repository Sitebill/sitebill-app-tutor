<?php

namespace SitebillApps\Lumen\Tutor\Services;

use Carbon\CarbonImmutable;
use SitebillApps\Lumen\Tutor\Models\Entry;
use SitebillApps\Lumen\Tutor\Models\Homework;
use SitebillApps\Lumen\Tutor\Models\Lesson;
use SitebillApps\Lumen\Tutor\Models\Student;
use SitebillApps\Lumen\Tutor\Models\Subject;

/**
 * The assistant of the app. It is rule based and works offline: it reads students, lessons, the journal and homework
 * and answers with findings and drafts. It never saves anything; the tutor accepts a draft in the UI.
 * An LLM provider can later be put behind the same methods.
 */
final class TutorAgent
{
    /** Homework that still waits for the student. */
    public const OPEN_HW = ['issued', 'in_progress', 'rework'];

    // ------------------------------------------------------------------ review

    /** @return list<array{code: string, severity: string, student_id: ?int, lesson_id: ?int, homework_id: ?int, meta: ?string}> */
    public function review(CarbonImmutable $today): array
    {
        $students = Student::query()->get()->keyBy('id');
        $lessons = Lesson::query()->get();
        $stats = Ledger::stats($today, $lessons);
        $out = [];
        $add = function (string $code, string $severity, ?int $student = null, ?string $meta = null, ?int $lesson = null, ?int $hw = null) use (&$out) {
            $out[] = ['code' => $code, 'severity' => $severity, 'student_id' => $student, 'lesson_id' => $lesson, 'homework_id' => $hw, 'meta' => $meta];
        };
        $name = fn (?int $id) => $students->get($id)?->name ?? '?';
        $date = fn ($l) => Ledger::dateOf($l);
        $isoToday = $today->toDateString();

        // 1. Debts.
        foreach ($students as $s) {
            $debt = $stats[$s->id]['debt'] ?? 0;
            if ($debt > 0 && ! in_array($s->status, ['archived'], true)) {
                $rate = (float) ($s->price ?: 0);
                $add('debt', $rate > 0 && $debt >= 3 * $rate ? 'bad' : 'warn', $s->id, $s->name . '|' . $this->num($debt));
            }
        }

        // 2. Lessons that took place without a journal record (last 30 days).
        $logged = Entry::query()->whereNotNull('lesson_id')->pluck('lesson_id')->flip();
        $unlogged = $lessons->filter(fn ($l) => $l->status === 'done' && $date($l) >= $today->subDays(30)->toDateString() && ! $logged->has($l->id))
            ->sortByDesc(fn ($l) => $date($l))->take(8);
        foreach ($unlogged as $l) {
            $add('unlogged', 'warn', $l->student_id, $name($l->student_id) . '|' . $date($l), $l->id);
        }

        // 3. Homework: overdue and waiting for a check.
        $homework = Homework::query()->get();
        foreach ($homework->filter(fn ($h) => in_array($h->status, self::OPEN_HW, true) && $h->due_on && substr((string) $h->getRawOriginal('due_on'), 0, 10) < $isoToday)->take(8) as $h) {
            $add('hw_overdue', 'bad', $h->student_id, $name($h->student_id) . '|' . $h->topic . '|' . substr((string) $h->getRawOriginal('due_on'), 0, 10), null, $h->id);
        }
        $toCheck = $homework->where('status', 'submitted');
        if ($toCheck->isNotEmpty()) {
            $add('hw_check', 'warn', $toCheck->first()->student_id, (string) $toCheck->count(), null, $toCheck->first()->id);
        }

        // 4. Active students without the next lesson, or silent for too long.
        foreach ($students->where('status', 'active') as $s) {
            $st = $stats[$s->id] ?? null;
            if ($st && $st['next_lesson_date']) {
                continue;
            }
            $last = $st['last_lesson_date'] ?? null;
            if ($last && $last < $today->subDays(14)->toDateString()) {
                $add('long_gap', 'warn', $s->id, $s->name . '|' . $last);
            } else {
                $add('no_next', 'info', $s->id, $s->name);
            }
        }

        // 5. Today and tomorrow: lessons that are not confirmed yet.
        $soon = $lessons->filter(fn ($l) => $l->status === 'planned' && $date($l) >= $isoToday && $date($l) <= $today->addDay()->toDateString())->sortBy(fn ($l) => $date($l) . $l->lesson_time)->take(6);
        foreach ($soon as $l) {
            $add('unconfirmed', 'info', $l->student_id, $name($l->student_id) . '|' . $date($l) . ' ' . substr((string) $l->lesson_time, 0, 5), $l->id);
        }

        // 6. Overlapping lessons in the future.
        $future = $lessons->filter(fn ($l) => in_array($l->status, Ledger::UPCOMING, true) && $date($l) >= $isoToday)->groupBy(fn ($l) => $date($l));
        foreach ($future as $day => $list) {
            $list = $list->sortBy('lesson_time')->values();
            for ($i = 0; $i < $list->count() - 1; $i++) {
                $a = $list[$i];
                $b = $list[$i + 1];
                if (Schedule::minutes(substr((string) $b->lesson_time, 0, 5)) < Schedule::minutes(substr((string) $a->lesson_time, 0, 5)) + (int) $a->duration) {
                    $add('conflict', 'bad', $a->student_id, $name($a->student_id) . '|' . $name($b->student_id) . '|' . $day . ' ' . substr((string) $b->lesson_time, 0, 5), $b->id);
                }
            }
        }

        // 7. Weak progress: the last three journal scores average 2.5 or less.
        $scores = Entry::query()->whereNotNull('score')->orderByDesc('entry_date')->orderByDesc('id')->get(['student_id', 'score'])->groupBy('student_id');
        foreach ($scores as $sid => $list) {
            $last = $list->take(3);
            if ($last->count() === 3 && $last->avg('score') <= 2.5 && ($students->get($sid)?->status === 'active')) {
                $add('low_score', 'warn', (int) $sid, $name((int) $sid) . '|' . number_format((float) $last->avg('score'), 1, '.', ''));
            }
        }

        return $out;
    }

    // ------------------------------------------------------------------ homework draft

    /** @return array{topic: string, body: string} */
    public function homeworkDraft(Student $student, ?string $topic, int $count, string $locale): array
    {
        $ru = str_starts_with($locale, 'ru');
        $subject = $student->subject_id ? Subject::query()->find($student->subject_id) : null;
        $topic = trim((string) $topic);
        if ($topic === '') {
            $topic = $this->firstLine($student->focus_topics) ?: $this->nextTopic($student, $subject) ?: ($subject?->name ?? ($ru ? 'Повторение пройденного' : 'Review of the material'));
        }
        $count = max(1, min(20, $count));
        $challenge = $count >= 5 ? 1 : 0;
        $warm = (int) ceil(($count - $challenge) * 0.4);
        $main = $count - $challenge - $warm;
        $hard = Entry::query()->where('student_id', $student->id)->whereNotNull('difficulties')->where('difficulties', '!=', '')->orderByDesc('entry_date')->orderByDesc('id')->limit(2)->pluck('difficulties')->map(fn ($d) => trim((string) $d))->filter()->implode('; ');
        $weak = $this->firstLine($student->weaknesses);

        $lines = [];
        $lines[] = $ru ? "Тема: {$topic}" : "Topic: {$topic}";
        $lines[] = '';
        $lines[] = $ru ? "1. Повторите правила и примеры из конспекта по теме «{$topic}» (10–15 минут)." : "1. Review the rules and the examples from your notes on \"{$topic}\" (10–15 minutes).";
        $n = 2;
        if ($warm > 0) {
            $lines[] = $ru ? "{$n}. Разминка: {$warm} " . $this->plural($warm, 'простое задание', 'простых задания', 'простых заданий') . ' на тему.' : "{$n}. Warm-up: {$warm} simple exercise" . ($warm > 1 ? 's' : '') . ' on the topic.';
            $n++;
        }
        if ($main > 0) {
            $lines[] = $ru ? "{$n}. Основная часть: {$main} " . $this->plural($main, 'задание', 'задания', 'заданий') . ' средней сложности.' : "{$n}. Main part: {$main} exercise" . ($main > 1 ? 's' : '') . ' of medium difficulty.';
            $n++;
        }
        if ($challenge) {
            $lines[] = $ru ? "{$n}. Задача повышенной сложности — по желанию, с записью хода решения." : "{$n}. One harder task — optional, write down your reasoning.";
            $n++;
        }
        if ($hard !== '') {
            $lines[] = $ru ? "{$n}. Работа над ошибками: вернитесь к тому, что вызвало затруднения ({$hard})." : "{$n}. Fix the mistakes: go back to what was difficult ({$hard}).";
            $n++;
        } elseif ($weak) {
            $lines[] = $ru ? "{$n}. Слабое место: уделите внимание — {$weak}." : "{$n}. Weak spot to pay attention to: {$weak}.";
            $n++;
        }
        $lines[] = $ru ? "{$n}. Самопроверка: проверьте ответы и отметьте, что осталось непонятным — разберём на занятии." : "{$n}. Self-check: verify your answers and mark what is still unclear — we will go through it at the lesson.";
        $lines[] = '';
        $lines[] = $ru ? 'Подберите конкретные упражнения из вашего сборника или материалов занятия: это шаблон структуры, а не готовые задачи.' : 'Pick the concrete exercises from your workbook or the lesson materials: this is a structure template, not ready-made tasks.';

        return ['topic' => $topic, 'body' => implode("\n", $lines)];
    }

    // ------------------------------------------------------------------ progress report

    /** @return array{title: string, body: string} */
    public function progressReport(Student $student, CarbonImmutable $from, CarbonImmutable $to, bool $withMoney, string $locale, CarbonImmutable $today): array
    {
        $ru = str_starts_with($locale, 'ru');
        $f = $from->toDateString();
        $t = $to->toDateString();
        $lessons = Lesson::query()->where('student_id', $student->id)->whereDate('lesson_date', '>=', $f)->whereDate('lesson_date', '<=', $t)->get();
        $entries = Entry::query()->where('student_id', $student->id)->whereDate('entry_date', '>=', $f)->whereDate('entry_date', '<=', $t)->orderBy('entry_date')->orderBy('id')->get();
        $homework = Homework::query()->where('student_id', $student->id)->whereDate('issued_on', '>=', $f)->whereDate('issued_on', '<=', $t)->get();
        $count = fn (string $status) => $lessons->where('status', $status)->count();
        $topics = $entries->pluck('topic')->map(fn ($x) => trim((string) $x))->filter()->unique()->take(8)->values();
        $avg = $entries->whereNotNull('score')->avg('score');
        $hwDone = $homework->whereIn('status', ['done', 'checked'])->count();
        $hwLate = $homework->filter(fn ($h) => in_array($h->status, self::OPEN_HW, true) && $h->due_on && substr((string) $h->getRawOriginal('due_on'), 0, 10) < $today->toDateString())->count();
        $next = Ledger::stats($today)[$student->id] ?? null;
        $subject = $student->subject_id ? Subject::query()->find($student->subject_id)?->name : null;

        $title = $ru ? "Отчёт о занятиях: {$student->name}" : "Progress report: {$student->name}";
        $L = [];
        $L[] = $ru ? "{$title}\nПериод: {$f} — {$t}" . ($subject ? "\nПредмет: {$subject}" : '') : "{$title}\nPeriod: {$f} — {$t}" . ($subject ? "\nSubject: {$subject}" : '');
        $L[] = '';
        $L[] = $ru
            ? "Занятия: проведено {$count('done')}, отменено репетитором {$count('cancelled_tutor')}, отменено учеником {$count('cancelled_student')}, пропущено без предупреждения {$count('no_show')}."
            : "Lessons: {$count('done')} held, {$count('cancelled_tutor')} cancelled by the tutor, {$count('cancelled_student')} cancelled by the student, {$count('no_show')} missed without notice.";
        if ($topics->isNotEmpty()) {
            $L[] = ($ru ? 'Пройденные темы: ' : 'Topics covered: ') . $topics->implode('; ') . '.';
        }
        if ($avg !== null) {
            $L[] = ($ru ? 'Средняя оценка усвоения материала: ' : 'Average mastery of the material: ') . number_format((float) $avg, 1, '.', '') . ' / 5.';
        }
        if ($homework->isNotEmpty()) {
            $L[] = $ru
                ? "Домашние задания: выдано {$homework->count()}, выполнено {$hwDone}" . ($hwLate ? ", просрочено {$hwLate}" : '') . '.'
                : "Homework: {$homework->count()} given, {$hwDone} done" . ($hwLate ? ", {$hwLate} overdue" : '') . '.';
        }
        if (trim((string) $student->strengths) !== '') {
            $L[] = ($ru ? 'Сильные стороны: ' : 'Strengths: ') . $this->oneLine($student->strengths) . '.';
        }
        $focus = $this->oneLine($student->focus_topics) ?: $this->oneLine($student->weaknesses);
        if ($focus !== '') {
            $L[] = ($ru ? 'Над чем работаем: ' : 'What we are working on: ') . $focus . '.';
        }
        $lastComment = $entries->reverse()->first(fn ($e) => trim((string) $e->comment) !== '');
        if ($lastComment) {
            $L[] = ($ru ? 'Комментарий преподавателя: ' : 'Tutor\'s comment: ') . trim((string) $lastComment->comment);
        }
        if ($next && $next['next_lesson_date']) {
            $L[] = ($ru ? 'Следующее занятие: ' : 'Next lesson: ') . $next['next_lesson_date'] . ' ' . $next['next_lesson_time'] . '.';
        }
        if ($withMoney && $next) {
            $cur = $this->currency($locale);
            $L[] = $next['debt'] > 0
                ? ($ru ? 'К оплате: ' : 'To pay: ') . $this->num($next['debt']) . ' ' . $cur . '.'
                : ($ru ? 'Задолженности нет.' : 'No outstanding balance.');
        }

        return ['title' => $title, 'body' => implode("\n", $L)];
    }

    // ------------------------------------------------------------------ helpers

    /** The first topic of the subject that the journal has not covered yet. */
    private function nextTopic(Student $student, ?Subject $subject): ?string
    {
        if (! $subject || trim((string) $subject->topics) === '') {
            return null;
        }
        $done = Entry::query()->where('student_id', $student->id)->pluck('topic')->map(fn ($x) => mb_strtolower(trim((string) $x)))->all();
        foreach (preg_split('/\R/u', (string) $subject->topics) ?: [] as $topic) {
            $topic = trim($topic);
            if ($topic !== '' && ! in_array(mb_strtolower($topic), $done, true)) {
                return $topic;
            }
        }

        return null;
    }

    private function firstLine(?string $text): ?string
    {
        foreach (preg_split('/\R/u', (string) $text) ?: [] as $line) {
            if (trim($line) !== '') {
                return trim($line);
            }
        }

        return null;
    }

    private function oneLine(?string $text): string
    {
        return implode('; ', array_filter(array_map('trim', preg_split('/\R/u', (string) $text) ?: [])));
    }

    private function num(float $n): string
    {
        return rtrim(rtrim(number_format($n, 2, '.', ''), '0'), '.');
    }

    private function currency(string $locale): string
    {
        return match (substr($locale, 0, 2)) {
            'ru' => '₽',
            'sr' => 'RSD',
            'tg' => 'TJS',
            default => '$',
        };
    }

    private function plural(int $n, string $one, string $few, string $many): string
    {
        $m = $n % 100;
        if ($m >= 11 && $m <= 14) {
            return $many;
        }

        return match ($n % 10) {
            1 => $one,
            2, 3, 4 => $few,
            default => $many,
        };
    }
}
