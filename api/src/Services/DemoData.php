<?php

namespace SitebillApps\Lumen\Tutor\Services;

use Carbon\CarbonImmutable;
use SitebillApps\Lumen\Tutor\Models\Entry;
use SitebillApps\Lumen\Tutor\Models\Guardian;
use SitebillApps\Lumen\Tutor\Models\Homework;
use SitebillApps\Lumen\Tutor\Models\Lesson;
use SitebillApps\Lumen\Tutor\Models\Payment;
use SitebillApps\Lumen\Tutor\Models\Student;
use SitebillApps\Lumen\Tutor\Models\Subject;

/** Sample data: a small private practice. Dates are relative to today so the screens always look alive. */
final class DemoData
{
    public function seed(bool $ru, CarbonImmutable $today): void
    {
        $t = fn (string $r, string $e) => $ru ? $r : $e;
        Settings::save(['work_days' => '1,2,3,4,5,6', 'work_from' => '09:00', 'work_to' => '21:00', 'default_price' => $ru ? '1800' : '35', 'default_duration' => '60', 'tutor_name' => $t('Елена Романова', 'Helen Ross')]);

        $subjects = [
            'math' => Subject::create(['name' => $t('Математика', 'Mathematics'), 'category' => $t('Школьные предметы', 'School subjects'), 'color' => '#0d9488', 'price' => $ru ? 1800 : 35,
                'description' => $t('Школьный курс и подготовка к ОГЭ.', 'School course and exam preparation.'),
                'topics' => $t("Дроби и действия с ними\nПроценты\nУравнения\nФункции и графики\nГеометрия: треугольники\nСистемы уравнений\nТеория вероятностей", "Fractions\nPercentages\nEquations\nFunctions and graphs\nGeometry: triangles\nSystems of equations\nProbability")]),
            'eng' => Subject::create(['name' => $t('Английский язык', 'English'), 'category' => $t('Иностранные языки', 'Languages'), 'color' => '#6366f1', 'price' => $ru ? 1600 : 32,
                'description' => $t('Разговорный и школьный английский.', 'Conversational and school English.'),
                'topics' => $t("Present Simple и Continuous\nPast Simple\nМодальные глаголы\nАртикли\nУсловные предложения\nПассивный залог", "Present Simple and Continuous\nPast Simple\nModal verbs\nArticles\nConditionals\nPassive voice")]),
            'phys' => Subject::create(['name' => $t('Физика', 'Physics'), 'category' => $t('Подготовка к ЕГЭ', 'Exam preparation'), 'color' => '#f59e0b', 'price' => $ru ? 2200 : 45,
                'description' => $t('Подготовка к ЕГЭ.', 'Exam preparation.'),
                'topics' => $t("Кинематика\nЗаконы Ньютона\nЗакон сохранения энергии\nМолекулярная физика\nЭлектростатика\nПостоянный ток", "Kinematics\nNewton's laws\nConservation of energy\nMolecular physics\nElectrostatics\nDirect current")]),
            'rus' => Subject::create(['name' => $t('Русский язык', 'Russian'), 'category' => $t('Начальная школа', 'Primary school'), 'color' => '#ec4899', 'price' => $ru ? 1400 : 28,
                'description' => $t('Правописание и чтение.', 'Spelling and reading.'),
                'topics' => $t("Безударные гласные\nПарные согласные\nСостав слова\nИмя существительное\nГлагол\nПредложение", "Unstressed vowels\nPaired consonants\nWord parts\nNouns\nVerbs\nThe sentence")]),
        ];

        // name, grade, subject, ISO weekday, time, price, status, format, goal, weak spots, parent
        $people = [
            [$t('Анна Соколова', 'Emma Clarke'), $t('5 класс', 'Grade 5'), 'math', 1, '16:00', $ru ? 1800 : 35, 'active', 'online', $t('Подтянуть математику до твёрдой четвёрки', 'Reach a solid B in maths'), $t("Дроби\nТаблица умножения", "Fractions\nMultiplication table"), [$t('Мария Соколова', 'Laura Clarke'), $t('мама', 'mother'), '+7 900 111-22-33']],
            [$t('Иван Морозов', 'Ben Morris'), $t('9 класс', 'Grade 9'), 'math', 2, '17:30', $ru ? 2000 : 40, 'active', 'offline', $t('Сдать ОГЭ на 5', 'Pass the exam with top marks'), $t("Уравнения\nФункции и графики", "Equations\nFunctions and graphs"), [$t('Олег Морозов', 'Paul Morris'), $t('папа', 'father'), '+7 900 222-33-44']],
            [$t('Софья Лебедева', 'Sophie Lane'), $t('7 класс', 'Grade 7'), 'eng', 3, '15:00', $ru ? 1600 : 32, 'active', 'online', $t('Заговорить свободно', 'Speak fluently'), $t("Артикли\nВремена глаголов", "Articles\nVerb tenses"), [$t('Ирина Лебедева', 'Anna Lane'), $t('мама', 'mother'), '+7 900 333-44-55']],
            [$t('Артём Кузнецов', 'Alex Cooper'), $t('11 класс', 'Grade 11'), 'phys', 4, '18:00', $ru ? 2200 : 45, 'active', 'online', $t('Набрать 80+ на ЕГЭ', 'Score 80+ at the exam'), $t("Законы Ньютона\nЭлектростатика", "Newton's laws\nElectrostatics"), [$t('Сергей Кузнецов', 'Mark Cooper'), $t('папа', 'father'), '+7 900 444-55-66']],
            [$t('Алиса Новикова', 'Lily Young'), $t('3 класс', 'Grade 3'), 'rus', 5, '14:00', $ru ? 1400 : 28, 'active', 'offline', $t('Грамотное письмо', 'Confident spelling'), $t("Безударные гласные", "Unstressed vowels"), [$t('Наталья Новикова', 'Kate Young'), $t('мама', 'mother'), '+7 900 555-66-77']],
            [$t('Максим Орлов', 'Max Fisher'), $t('Взрослый', 'Adult'), 'eng', 6, '11:00', $ru ? 1800 : 36, 'paused', 'online', $t('Английский для работы', 'English for work'), $t("Артикли", "Articles"), null],
        ];

        $emails = ['anna', 'ivan', 'sofia', 'artem', 'alisa', 'maxim'];
        foreach ($people as $i => [$name, $grade, $sub, $dow, $time, $price, $status, $format, $goal, $weak, $parent]) {
            $student = Student::create([
                'name' => $name, 'grade' => $grade, 'subject_id' => $subjects[$sub]->id, 'format' => $format, 'price' => $price, 'duration' => 60, 'status' => $status,
                'started_on' => $today->subWeeks(14 - $i)->toDateString(), 'goal' => $goal, 'weaknesses' => $weak, 'focus_topics' => $weak,
                'strengths' => $t('Старательный, быстро схватывает объяснения', 'Hard-working, grasps explanations quickly'),
                'level' => $t('Средний', 'Intermediate'), 'desired_result' => $goal,
                'phone' => '+7 911 000-0' . ($i + 1) . '-0' . ($i + 1), 'email' => $emails[$i] . '@example.com',
                'notes' => $t('Лучше заниматься до 19:00, потом устаёт.', 'Works best before 7 pm, gets tired later.'),
            ]);
            if ($parent) {
                Guardian::create(['student_id' => $student->id, 'name' => $parent[0], 'relation' => $parent[1], 'phone' => $parent[2]]);
            }
            $this->lessonsFor($student, $subjects[$sub], $dow, $time, $price, $status, $i, $today, $ru);
        }
    }

    private function lessonsFor(Student $student, Subject $subject, int $dow, string $time, int|float $price, string $status, int $i, CarbonImmutable $today, bool $ru): void
    {
        $topics = array_values(array_filter(array_map('trim', preg_split('/\R/u', (string) $subject->topics) ?: [])));
        $difficulties = $ru
            ? ['Путает порядок действий', 'Ошибки в знаках', 'Не сразу видит способ решения', 'Нужно больше практики']
            : ['Mixes up the order of operations', 'Sign mistakes', 'Does not see the approach at once', 'Needs more practice'];
        $comments = $ru
            ? ['Хороший темп, продолжаем.', 'Нужно повторить дома.', 'Отличная работа на занятии!', 'Устал, материал усвоен частично.']
            : ['Good pace, keep going.', 'Needs review at home.', 'Great work today!', 'Tired, partly learnt.'];

        $first = $today->startOfWeek()->addDays($dow - 1);
        $series = null;
        $paidLessons = 0;
        $doneCount = 0;
        $k = 0;
        // Five weeks back and two weeks ahead; a paused student has only the past.
        for ($w = -5; $w <= ($status === 'paused' ? -3 : 2); $w++) {
            $date = $first->addWeeks($w);
            $isPast = $date < $today;
            $st = $isPast ? 'done' : ((int) abs($date->diffInDays($today)) <= 1 ? 'confirmed' : 'planned');
            // A few cancellations make the history look real.
            if ($isPast && $i === 2 && $w === -4) {
                $st = 'cancelled_student';
            }
            if ($isPast && $i === 4 && $w === -3) {
                $st = 'no_show';
            }
            $lesson = Lesson::create([
                'student_id' => $student->id, 'subject_id' => $subject->id, 'series_id' => $series, 'lesson_date' => $date->toDateString(), 'lesson_time' => $time . ':00',
                'duration' => 60, 'format' => $student->format, 'price' => $price, 'status' => $st,
                'place' => $student->format === 'online' ? 'https://meet.example.com/' . substr(md5((string) $student->id), 0, 8) : ($ru ? 'ул. Садовая, 12' : '12 Garden St.'),
            ]);
            $series ??= $lesson->id;
            if ($lesson->series_id === null) {
                $lesson->update(['series_id' => $series]);
            }
            if ($st !== 'done') {
                continue;
            }
            $doneCount++;
            // Two latest lessons of the second student have no journal record: the assistant points at them.
            $skipJournal = $i === 1 && $w >= -2;
            if (! $skipJournal) {
                $topic = $topics[$k % max(1, count($topics))] ?? $subject->name;
                $entry = Entry::create([
                    'student_id' => $student->id, 'lesson_id' => $lesson->id, 'subject_id' => $subject->id, 'entry_date' => $date->toDateString(), 'topic' => $topic,
                    'material' => $ru ? "Разобрали правило и примеры по теме «{$topic}»." : "We went through the rule and the examples on \"{$topic}\".",
                    'exercises' => $ru ? 'Упражнения 1–6 из рабочей тетради.' : 'Exercises 1–6 from the workbook.',
                    'results' => $ru ? 'Справился с большей частью заданий.' : 'Managed most of the tasks.',
                    'difficulties' => $difficulties[($k + $i) % count($difficulties)], 'comment' => $comments[($k + $i) % count($comments)],
                    'score' => $i === 3 ? [2, 2, 3, 2, 3][$k % 5] : 3 + (($k + $i) % 3), 'links' => $k === 2 ? 'https://example.com/notes/' . $student->id : null,
                ]);
                $this->homework($student, $subject, $lesson, $entry->topic, $date, $today, $k, $i, $ru);
            }
            $k++;
        }

        // Prepaid packages of four lessons; the fifth student owes for the last lessons.
        $packages = max(0, intdiv($doneCount, 4)) + ($status === 'active' ? 1 : 0);
        if ($i === 4) {
            $packages = max(0, $packages - 1);
        }
        for ($p = 0; $p < $packages; $p++) {
            Payment::create(['student_id' => $student->id, 'paid_on' => $today->subWeeks(5 - $p * 2)->toDateString(), 'amount' => $price * 4, 'lessons_count' => 4, 'note' => $ru ? 'Абонемент на 4 занятия' : 'A package of 4 lessons']);
        }
    }

    private function homework(Student $student, Subject $subject, Lesson $lesson, string $topic, CarbonImmutable $date, CarbonImmutable $today, int $k, int $i, bool $ru): void
    {
        $due = $date->addDays(5);
        $age = (int) abs($date->diffInDays($today));
        // Fresh homework is still open, older one is handed in and checked; a couple of cases stay overdue or need rework.
        $status = $age <= 7 ? ($due < $today ? 'issued' : 'in_progress') : 'checked';
        if ($age <= 7 && $i === 2) {
            $status = 'submitted';
        }
        if ($age > 7 && $age <= 14 && $i === 0) {
            $status = 'rework';
        }
        if ($age > 14 && $k % 3 === 0) {
            $status = 'done';
        }
        Homework::create([
            'student_id' => $student->id, 'subject_id' => $subject->id, 'lesson_id' => $lesson->id, 'topic' => $topic, 'issued_on' => $date->toDateString(), 'due_on' => $due->toDateString(), 'status' => $status,
            'body' => $ru ? "Повторить конспект по теме «{$topic}» и выполнить 6 заданий из тетради." : "Review the notes on \"{$topic}\" and do 6 exercises from the workbook.",
            'comment' => $status === 'rework' ? ($ru ? 'Исправить ошибки в заданиях 3 и 5.' : 'Fix the mistakes in tasks 3 and 5.') : null,
        ]);
    }
}
