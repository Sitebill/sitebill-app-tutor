<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class LessonMove extends AppModel
{
    protected $table = 'app_rumantic_tutor_lesson_moves';

    protected $fillable = ['lesson_id', 'from_date', 'from_time', 'to_date', 'to_time', 'note'];
}
