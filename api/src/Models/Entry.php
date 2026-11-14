<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Entry extends AppModel
{
    protected $table = 'app_rumantic_tutor_entries';

    protected $fillable = ['student_id', 'lesson_id', 'subject_id', 'entry_date', 'topic', 'material', 'exercises', 'results', 'difficulties', 'homework_text', 'comment', 'score', 'links'];
}
