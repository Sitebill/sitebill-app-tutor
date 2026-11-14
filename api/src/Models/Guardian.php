<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

/** A parent or another representative of the student (contacts only; no separate login yet). */
class Guardian extends AppModel
{
    protected $table = 'app_rumantic_tutor_guardians';

    protected $fillable = ['student_id', 'name', 'relation', 'phone', 'email'];
}
