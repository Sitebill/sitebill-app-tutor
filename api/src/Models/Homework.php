<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Homework extends AppModel
{
    protected $table = 'app_rumantic_tutor_homework';

    protected $fillable = ['student_id', 'subject_id', 'lesson_id', 'topic', 'body', 'issued_on', 'due_on', 'status', 'comment', 'links'];
}
