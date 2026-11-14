<?php

namespace SitebillApps\Lumen\Tutor\GraphQL;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Sitebill\AppSdk\Host;
use SitebillApps\Lumen\Tutor\Models\Entry;
use SitebillApps\Lumen\Tutor\Models\Guardian;
use SitebillApps\Lumen\Tutor\Models\Homework;
use SitebillApps\Lumen\Tutor\Models\Lesson;
use SitebillApps\Lumen\Tutor\Models\LessonMove;
use SitebillApps\Lumen\Tutor\Models\Payment;
use SitebillApps\Lumen\Tutor\Models\Student;
use SitebillApps\Lumen\Tutor\Models\Subject;
use SitebillApps\Lumen\Tutor\Services\DemoData;
use SitebillApps\Lumen\Tutor\Services\Ledger;
use SitebillApps\Lumen\Tutor\Services\Schedule;
use SitebillApps\Lumen\Tutor\Services\Settings;
use SitebillApps\Lumen\Tutor\Services\TutorAgent;

/** Admin GraphQL of the app. Permissions are checked by @guard + @can in the schema; tenant scope by AppModel. */
final class TutorResolver
{
    // ------------------------------------------------------------------ reads

    public function subjects(): array
    {
        return Subject::query()->orderBy('name')->get()->map(fn (Subject $s) => $this->plain($s))->all();
    }

    public function students(): array
    {
        $stats = Ledger::stats(CarbonImmutable::today());

        return Student::query()->orderBy('name')->get()->map(function (Student $s) use ($stats) {
            return $this->plain($s) + ($stats[$s->id] ?? ['lessons_done' => 0, 'lessons_paid' => 0, 'balance' => 0.0, 'debt' => 0.0, 'next_lesson_date' => null, 'next_lesson_time' => null, 'last_lesson_date' => null]);
        })->all();
    }

    public function guardians(mixed $root, array $args): array
    {
        return Guardian::query()->when(! empty($args['student_id']), fn ($q) => $q->where('student_id', $args['student_id']))->orderBy('id')->get()->map(fn ($g) => $this->plain($g))->all();
    }

    public function lessons(mixed $root, array $args): array
    {
        $lessons = Lesson::query()
            ->when(! empty($args['from']), fn ($q) => $q->whereDate('lesson_date', '>=', $args['from']))
            ->when(! empty($args['to']), fn ($q) => $q->whereDate('lesson_date', '<=', $args['to']))
            ->when(! empty($args['student_id']), fn ($q) => $q->where('student_id', $args['student_id']))
            ->orderBy('lesson_date')->orderBy('lesson_time')->orderBy('id')
            ->limit(max(1, min(5000, (int) ($args['limit'] ?? 3000))))->get();

        return $this->withMoves($lessons);
    }

    public function lessonMoves(mixed $root, array $args): array
    {
        Lesson::query()->findOrFail($args['lesson_id']);

        return LessonMove::query()->where('lesson_id', $args['lesson_id'])->orderBy('id')->get()->map(function (LessonMove $m) {
            $row = $this->plain($m);
            $row['created_at'] = $m->created_at?->format('Y-m-d H:i');

            return $row;
        })->all();
    }

    public function entries(mixed $root, array $args): array
    {
        $search = trim((string) ($args['search'] ?? ''));

        return Entry::query()
            ->when(! empty($args['student_id']), fn ($q) => $q->where('student_id', $args['student_id']))
            ->when(! empty($args['from']), fn ($q) => $q->whereDate('entry_date', '>=', $args['from']))
            ->when(! empty($args['to']), fn ($q) => $q->whereDate('entry_date', '<=', $args['to']))
            ->when($search !== '', function ($q) use ($search) {
                $like = '%' . str_replace(['%', '_'], ['\\%', '\\_'], $search) . '%';
                $q->where(fn ($w) => $w->where('topic', 'like', $like)->orWhere('material', 'like', $like)->orWhere('exercises', 'like', $like)
                    ->orWhere('results', 'like', $like)->orWhere('difficulties', 'like', $like));
            })
            ->orderByDesc('entry_date')->orderByDesc('id')
            ->limit(max(1, min(2000, (int) ($args['limit'] ?? 500))))->get()
            ->map(fn (Entry $e) => $this->plain($e))->all();
    }

    public function homework(mixed $root, array $args): array
    {
        $today = $this->today($args)->toDateString();

        return Homework::query()
            ->when(! empty($args['student_id']), fn ($q) => $q->where('student_id', $args['student_id']))
            ->when(! empty($args['status']), fn ($q) => $q->where('status', $args['status']))
            ->orderByDesc('issued_on')->orderByDesc('id')
            ->limit(max(1, min(5000, (int) ($args['limit'] ?? 1000))))->get()
            ->map(function (Homework $h) use ($today) {
                $row = $this->plain($h);
                $row['is_overdue'] = in_array($h->status, TutorAgent::OPEN_HW, true) && ! empty($row['due_on']) && $row['due_on'] < $today;

                return $row;
            })->all();
    }

    public function payments(mixed $root, array $args): array
    {
        return Payment::query()->when(! empty($args['student_id']), fn ($q) => $q->where('student_id', $args['student_id']))
            ->orderByDesc('paid_on')->orderByDesc('id')->get()->map(fn ($p) => $this->plain($p))->all();
    }

    public function settings(): array
    {
        return $this->settingsRow();
    }

    // ------------------------------------------------------------------ assistant (never writes)

    public function review(mixed $root, array $args): array
    {
        return (new TutorAgent())->review($this->today($args));
    }

    public function conflicts(mixed $root, array $args): array
    {
        return Schedule::conflicts($args['date'], $args['time'], (int) ($args['duration'] ?? 60), isset($args['exclude_id']) ? (int) $args['exclude_id'] : null);
    }

    public function freeSlots(mixed $root, array $args): array
    {
        return Schedule::freeSlots($args['date'], (int) ($args['duration'] ?? 60), (int) ($args['days'] ?? 1));
    }

    public function homeworkDraft(mixed $root, array $args): array
    {
        return (new TutorAgent())->homeworkDraft(Student::query()->findOrFail($args['student_id']), $args['topic'] ?? null, (int) ($args['count'] ?? 6), $this->locale($args));
    }

    public function progressReport(mixed $root, array $args): array
    {
        $today = CarbonImmutable::today();
        $to = ! empty($args['to']) ? CarbonImmutable::parse($args['to']) : $today;
        $from = ! empty($args['from']) ? CarbonImmutable::parse($args['from']) : $to->subDays(30);

        return (new TutorAgent())->progressReport(Student::query()->findOrFail($args['student_id']), $from, $to, (bool) ($args['with_money'] ?? false), $this->locale($args), $today);
    }

    // ------------------------------------------------------------------ subjects and students

    public function saveSubject(mixed $root, array $args): array
    {
        $subject = ! empty($args['id']) ? Subject::query()->findOrFail($args['id']) : new Subject();
        $subject->fill($args['input'] + ['color' => $subject->color ?: '#0d9488'])->save();

        return $this->plain($subject);
    }

    public function deleteSubject(mixed $root, array $args): bool
    {
        $subject = Subject::query()->findOrFail($args['id']);
        // Rows keep their history; they only lose the link to the subject.
        Student::query()->where('subject_id', $subject->id)->update(['subject_id' => null]);
        Lesson::query()->where('subject_id', $subject->id)->update(['subject_id' => null]);
        Entry::query()->where('subject_id', $subject->id)->update(['subject_id' => null]);
        Homework::query()->where('subject_id', $subject->id)->update(['subject_id' => null]);
        $subject->delete();

        return true;
    }

    public function saveStudent(mixed $root, array $args): array
    {
        $in = $args['input'];
        foreach (['status', 'format'] as $required) {
            if (array_key_exists($required, $in) && $in[$required] === null) {
                unset($in[$required]); // NOT NULL columns keep their value
            }
        }
        $this->ownSubject($in['subject_id'] ?? null);
        $student =! empty($args['id']) ? Student::query()->findOrFail($args['id']) : new Student();
        if (! $student->exists) {
            $cfg = Settings::all();
            $in += ['price' => (float) $cfg['default_price'], 'duration' => (int) $cfg['default_duration'], 'status' => 'new', 'format' => 'online'];
        }
        $student->fill($in)->save();

        return $this->plain($student) + (Ledger::stats(CarbonImmutable::today())[$student->id] ?? ['lessons_done' => 0, 'lessons_paid' => 0, 'balance' => 0.0, 'debt' => 0.0, 'next_lesson_date' => null, 'next_lesson_time' => null, 'last_lesson_date' => null]);
    }

    public function deleteStudent(mixed $root, array $args): bool
    {
        $student = Student::query()->findOrFail($args['id']);
        LessonMove::query()->whereIn('lesson_id', Lesson::query()->where('student_id', $student->id)->pluck('id'))->delete();
        foreach ([Lesson::class, Entry::class, Homework::class, Payment::class, Guardian::class] as $model) {
            $model::query()->where('student_id', $student->id)->delete();
        }
        $student->delete();

        return true;
    }

    public function saveGuardian(mixed $root, array $args): array
    {
        $in = $args['input'];
        Student::query()->findOrFail($in['student_id']);
        $g = ! empty($args['id']) ? Guardian::query()->findOrFail($args['id']) : new Guardian();
        $g->fill($in)->save();

        return $this->plain($g);
    }

    public function deleteGuardian(mixed $root, array $args): bool
    {
        Guardian::query()->findOrFail($args['id'])->delete();

        return true;
    }

    // ------------------------------------------------------------------ lessons

    /** Creates or edits a lesson. A new lesson with repeat_weeks > 1 becomes a weekly series. @return list<array> */
    public function saveLesson(mixed $root, array $args): array
    {
        $in = $args['input'];
        $student = Student::query()->findOrFail($in['student_id']);
        $this->ownSubject($in['subject_id'] ?? null);
        $repeat = (int) ($in['repeat_weeks'] ?? 1);
        unset($in['repeat_weeks']);
        $cfg = Settings::all();
        $defaults = [
            'subject_id' => $student->subject_id,
            'duration' => $student->duration ?: (int) $cfg['default_duration'],
            'format' => $student->format ?: 'online',
            'price' => $student->price ?? (float) $cfg['default_price'],
            'status' => 'planned',
        ];
        $in = array_filter($in, fn ($v) => $v !== null) + $defaults;
        $in['lesson_time'] = substr((string) $in['lesson_time'], 0, 5) . ':00';

        if (! empty($args['id'])) {
            $lesson = Lesson::query()->findOrFail($args['id']);
            // Moving a lesson by hand through the form keeps the history just like the reschedule action does.
            $this->recordMove($lesson, $in['lesson_date'], $in['lesson_time']);
            $lesson->fill($in)->save();

            return $this->withMoves(collect([$lesson]));
        }

        $created = [];
        $series = null;
        $first = CarbonImmutable::parse($in['lesson_date']);
        for ($n = 0; $n < max(1, $repeat); $n++) {
            $lesson = Lesson::create(['series_id' => $series, 'lesson_date' => $first->addWeeks($n)->toDateString()] + $in);
            if ($repeat > 1 && $series === null) {
                $series = $lesson->id;
                $lesson->update(['series_id' => $series]);
            }
            $created[] = $lesson;
        }

        return $this->withMoves(collect($created));
    }

    public function setLessonStatus(mixed $root, array $args): array
    {
        $lesson = Lesson::query()->findOrFail($args['id']);
        $lesson->update(['status' => $args['status']]);
        $out = [$lesson];
        // The next lesson of a weekly series appears by itself when the last planned one is held.
        if ($args['status'] === 'done' && $lesson->series_id) {
            $date = Ledger::dateOf($lesson);
            $hasLater = Lesson::query()->where('series_id', $lesson->series_id)->whereDate('lesson_date', '>', $date)->exists();
            if (! $hasLater) {
                $out[] = Lesson::create([
                    'student_id' => $lesson->student_id, 'subject_id' => $lesson->subject_id, 'series_id' => $lesson->series_id,
                    'lesson_date' => CarbonImmutable::parse($date)->addWeek()->toDateString(), 'lesson_time' => $lesson->lesson_time, 'duration' => $lesson->duration,
                    'format' => $lesson->format, 'place' => $lesson->place, 'price' => $lesson->price, 'status' => 'planned',
                ]);
            }
        }

        return $this->withMoves(collect($out));
    }

    public function rescheduleLesson(mixed $root, array $args): array
    {
        $lesson = Lesson::query()->findOrFail($args['id']);
        $time = substr((string) $args['time'], 0, 5) . ':00';
        $this->recordMove($lesson, $args['date'], $time, $args['note'] ?? null);
        $lesson->fill(['lesson_date' => $args['date'], 'lesson_time' => $time, 'status' => in_array($lesson->status, ['done', 'no_show'], true) ? $lesson->status : 'planned'])->save();

        return $this->withMoves(collect([$lesson]))[0];
    }

    public function deleteLesson(mixed $root, array $args): bool
    {
        $lesson = Lesson::query()->findOrFail($args['id']);
        $ids = [$lesson->id];
        if (! empty($args['series']) && $lesson->series_id) {
            $today = CarbonImmutable::today()->toDateString();
            $ids = Lesson::query()->where('series_id', $lesson->series_id)->whereIn('status', Ledger::UPCOMING)->whereDate('lesson_date', '>=', $today)->pluck('id')->all();
            $ids[] = $lesson->id;
        }
        $ids = array_values(array_unique($ids));
        LessonMove::query()->whereIn('lesson_id', $ids)->delete();
        // A journal record and homework survive the lesson: they only lose the link.
        Entry::query()->whereIn('lesson_id', $ids)->update(['lesson_id' => null]);
        Homework::query()->whereIn('lesson_id', $ids)->update(['lesson_id' => null]);
        Lesson::query()->whereIn('id', $ids)->delete();

        return true;
    }

    // ------------------------------------------------------------------ journal, homework, payments

    public function saveEntry(mixed $root, array $args): array
    {
        $in = $args['input'];
        Student::query()->findOrFail($in['student_id']);
        $this->ownSubject($in['subject_id'] ?? null);
        $this->ownLesson($in['lesson_id'] ?? null, (int) $in['student_id']);
        $e = ! empty($args['id']) ? Entry::query()->findOrFail($args['id']) : new Entry();
        $e->fill($in)->save();

        return $this->plain($e);
    }

    public function deleteEntry(mixed $root, array $args): bool
    {
        Entry::query()->findOrFail($args['id'])->delete();

        return true;
    }

    public function saveHomework(mixed $root, array $args): array
    {
        $in = $args['input'];
        Student::query()->findOrFail($in['student_id']);
        $this->ownSubject($in['subject_id'] ?? null);
        $this->ownLesson($in['lesson_id'] ?? null, (int) $in['student_id']);
        $h = ! empty($args['id']) ? Homework::query()->findOrFail($args['id']) : new Homework();
        if (! $h->exists) {
            $in += ['issued_on' => CarbonImmutable::today()->toDateString(), 'status' => 'issued'];
        }
        $h->fill(array_filter($in, fn ($v) => $v !== null))->save();

        return $this->homeworkRow($h);
    }

    public function setHomeworkStatus(mixed $root, array $args): array
    {
        $h = Homework::query()->findOrFail($args['id']);
        $h->update(['status' => $args['status']]);

        return $this->homeworkRow($h);
    }

    public function deleteHomework(mixed $root, array $args): bool
    {
        Homework::query()->findOrFail($args['id'])->delete();

        return true;
    }

    public function savePayment(mixed $root, array $args): array
    {
        $in = $args['input'];
        Student::query()->findOrFail($in['student_id']);
        $p = ! empty($args['id']) ? Payment::query()->findOrFail($args['id']) : new Payment();
        $in['paid_on'] = $in['paid_on'] ?? ($p->exists ? substr((string) $p->getRawOriginal('paid_on'), 0, 10) : CarbonImmutable::today()->toDateString());
        $in['lessons_count'] = $in['lessons_count'] ?? 0;
        $p->fill($in)->save();

        return $this->plain($p);
    }

    public function deletePayment(mixed $root, array $args): bool
    {
        Payment::query()->findOrFail($args['id'])->delete();

        return true;
    }

    public function saveSettings(mixed $root, array $args): array
    {
        Settings::save($args['input']);

        return $this->settingsRow();
    }

    public function seedDemo(mixed $root, array $args): bool
    {
        if (Student::query()->exists() || Subject::query()->exists()) {
            return false;
        }
        // The browser tells which language the owner reads the site in; fall back to the site's own locale.
        $ru = str_starts_with((string) ($args['locale'] ?? Host::site()->current()?->locale), 'ru');
        (new DemoData())->seed($ru, CarbonImmutable::today());

        return true;
    }

    // ------------------------------------------------------------------ helpers

    /** Writes a row of the reschedule history when the date or the time really change. */
    private function recordMove(Lesson $lesson, string $toDate, string $toTime, ?string $note = null): void
    {
        $fromDate = Ledger::dateOf($lesson);
        $fromTime = substr((string) $lesson->lesson_time, 0, 8);
        if ($fromDate === $toDate && substr($fromTime, 0, 5) === substr($toTime, 0, 5)) {
            return;
        }
        LessonMove::create(['lesson_id' => $lesson->id, 'from_date' => $fromDate, 'from_time' => $fromTime, 'to_date' => $toDate, 'to_time' => $toTime, 'note' => $note]);
    }

    /** A subject must belong to this site (the tenant scope makes the lookup fail otherwise). */
    private function ownSubject(mixed $id): void
    {
        if (! empty($id)) {
            Subject::query()->findOrFail($id);
        }
    }

    private function ownLesson(mixed $id, int $studentId): void
    {
        if (! empty($id)) {
            Lesson::query()->where('student_id', $studentId)->findOrFail($id);
        }
    }

    private function homeworkRow(Homework $h): array
    {
        $row = $this->plain($h);
        $row['is_overdue'] = in_array($h->status, TutorAgent::OPEN_HW, true) && ! empty($row['due_on']) && $row['due_on'] < CarbonImmutable::today()->toDateString();

        return $row;
    }

    /** @param  \Illuminate\Support\Collection<int, Lesson>  $lessons */
    private function withMoves($lessons): array
    {
        $moves = LessonMove::query()->whereIn('lesson_id', $lessons->pluck('id'))->selectRaw('lesson_id, count(*) as c')->groupBy('lesson_id')->pluck('c', 'lesson_id');

        return $lessons->values()->map(function (Lesson $l) use ($moves) {
            $row = $this->plain($l);
            $row['moves'] = (int) ($moves[$l->id] ?? 0);

            return $row;
        })->all();
    }

    private function settingsRow(): array
    {
        $s = Settings::all();

        return [
            'work_days' => $s['work_days'], 'work_from' => $s['work_from'], 'work_to' => $s['work_to'],
            'default_price' => (float) $s['default_price'], 'default_duration' => (int) $s['default_duration'],
            'holidays' => $s['holidays'], 'tutor_name' => $s['tutor_name'],
        ];
    }

    private function plain(Model $m): array
    {
        $a = $m->attributesToArray();
        foreach (['birth_date', 'started_on', 'lesson_date', 'entry_date', 'issued_on', 'due_on', 'paid_on', 'from_date', 'to_date'] as $f) {
            if (! empty($a[$f])) {
                $a[$f] = substr((string) $a[$f], 0, 10);
            }
        }
        foreach (['lesson_time', 'from_time', 'to_time'] as $f) {
            if (! empty($a[$f])) {
                $a[$f] = substr((string) $a[$f], 0, 5);
            }
        }
        foreach (['price', 'amount'] as $f) {
            if (array_key_exists($f, $a) && $a[$f] !== null) {
                $a[$f] = (float) $a[$f];
            }
        }

        return $a;
    }

    private function locale(array $args): string
    {
        return (string) ($args['locale'] ?? Host::site()->current()?->locale ?? 'en');
    }

    private function today(array $args): CarbonImmutable
    {
        return CarbonImmutable::parse($args['today'] ?? 'today')->startOfDay();
    }
}
