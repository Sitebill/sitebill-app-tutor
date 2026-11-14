<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Student extends AppModel
{
    protected $table = 'app_rumantic_tutor_students';

    protected $fillable = ['name', 'birth_date', 'grade', 'school', 'phone', 'email', 'subject_id', 'started_on', 'format', 'price', 'duration', 'goal', 'level', 'desired_result', 'strengths', 'weaknesses', 'focus_topics', 'wishes', 'notes', 'status'];
}
