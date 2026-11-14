<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_rumantic_tutor_subjects', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('name', 120);
            $table->string('category', 80)->nullable();
            $table->text('description')->nullable();
            $table->text('program')->nullable();
            // Typical topics, one per line: the assistant uses them for homework drafts.
            $table->text('topics')->nullable();
            $table->decimal('price', 10, 2)->nullable();
            $table->string('color', 20)->default('#0d9488');
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_students', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('name', 160);
            $table->date('birth_date')->nullable();
            $table->string('grade', 60)->nullable();
            $table->string('school', 160)->nullable();
            $table->string('phone', 60)->nullable();
            $table->string('email', 160)->nullable();
            $table->unsignedBigInteger('subject_id')->nullable()->index();
            $table->date('started_on')->nullable();
            $table->string('format', 20)->default('online'); // online | offline
            $table->decimal('price', 10, 2)->nullable();
            $table->unsignedSmallInteger('duration')->nullable();
            $table->text('goal')->nullable();
            $table->text('level')->nullable();
            $table->text('desired_result')->nullable();
            $table->text('strengths')->nullable();
            $table->text('weaknesses')->nullable();
            // Topics that need extra attention, one per line.
            $table->text('focus_topics')->nullable();
            $table->text('wishes')->nullable();
            // Private notes of the tutor: never shown to a parent or put into a report.
            $table->text('notes')->nullable();
            $table->string('status', 20)->default('new')->index(); // new | active | paused | finished | archived
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_guardians', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->string('name', 160);
            $table->string('relation', 60)->nullable();
            $table->string('phone', 60)->nullable();
            $table->string('email', 160)->nullable();
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_lessons', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('subject_id')->nullable();
            // Lessons created together as a weekly series share this id.
            $table->unsignedBigInteger('series_id')->nullable()->index();
            $table->date('lesson_date')->index();
            $table->time('lesson_time');
            $table->unsignedSmallInteger('duration')->default(60);
            $table->string('format', 20)->default('online');
            $table->string('place', 300)->nullable(); // address or a video conference link
            $table->decimal('price', 10, 2)->default(0);
            // planned | confirmed | done | cancelled_tutor | cancelled_student | no_show | rescheduled
            $table->string('status', 24)->default('planned')->index();
            $table->string('comment', 500)->nullable();
            $table->timestamps();
        });

        // Rescheduling keeps the history: the lesson stays the same row, every move is recorded here.
        Schema::create('app_rumantic_tutor_lesson_moves', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('lesson_id')->index();
            $table->date('from_date');
            $table->time('from_time');
            $table->date('to_date');
            $table->time('to_time');
            $table->string('note', 300)->nullable();
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_entries', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('lesson_id')->nullable()->index();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->date('entry_date')->index();
            $table->string('topic', 250);
            $table->text('material')->nullable();
            $table->text('exercises')->nullable();
            $table->text('results')->nullable();
            $table->text('difficulties')->nullable();
            $table->text('homework_text')->nullable();
            $table->text('comment')->nullable();
            $table->unsignedTinyInteger('score')->nullable(); // how well the material was learnt, 1..5
            // Links to notebooks' photos, documents, videos: one per line. Files are not stored by the app.
            $table->text('links')->nullable();
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_homework', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->unsignedBigInteger('lesson_id')->nullable();
            $table->string('topic', 250);
            $table->text('body')->nullable();
            $table->date('issued_on');
            $table->date('due_on')->nullable();
            // issued | in_progress | submitted | done | checked | rework ("overdue" is calculated)
            $table->string('status', 20)->default('issued')->index();
            $table->text('comment')->nullable();
            $table->text('links')->nullable();
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->date('paid_on');
            $table->decimal('amount', 10, 2);
            // How many lessons the payment covers (0 = just money).
            $table->unsignedSmallInteger('lessons_count')->default(0);
            $table->string('note', 300)->nullable();
            $table->timestamps();
        });

        Schema::create('app_rumantic_tutor_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->string('name', 60);
            $table->text('value')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'name']);
        });
    }

    public function down(): void
    {
        foreach (['settings', 'payments', 'homework', 'entries', 'lesson_moves', 'lessons', 'guardians', 'students', 'subjects'] as $t) {
            Schema::dropIfExists('app_rumantic_tutor_' . $t);
        }
    }
};
