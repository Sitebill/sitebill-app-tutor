<?php

namespace SitebillApps\Lumen\Tutor\Models;

use Sitebill\AppSdk\AppModel;

class Setting extends AppModel
{
    protected $table = 'app_rumantic_tutor_settings';

    protected $fillable = ['name', 'value'];
}
