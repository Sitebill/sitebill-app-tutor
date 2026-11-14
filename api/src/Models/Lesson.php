<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Lesson extends AppModel
{
    protected $table = 'app_rumantic_tutor_lessons';

    protected $fillable = ['student_id', 'subject_id', 'series_id', 'lesson_date', 'lesson_time', 'duration', 'format', 'place', 'price', 'status', 'comment'];
}
