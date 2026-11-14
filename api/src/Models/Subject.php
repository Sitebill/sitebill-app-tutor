<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Subject extends AppModel
{
    protected $table = 'app_rumantic_tutor_subjects';

    protected $fillable = ['name', 'category', 'description', 'program', 'topics', 'price', 'color'];
}
