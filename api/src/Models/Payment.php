<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Payment extends AppModel
{
    protected $table = 'app_rumantic_tutor_payments';

    protected $fillable = ['student_id', 'paid_on', 'amount', 'lessons_count', 'note'];
}
