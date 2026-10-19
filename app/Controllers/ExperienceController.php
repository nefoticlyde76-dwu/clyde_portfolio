<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Experience;
use App\Models\Skill;

class ExperienceController extends PublicController
{
    public function index(): void
    {
        $siteName = $this->siteName();

        $this->page('public/experience', [
            'title' => $this->titled('Skills and experience', $siteName),
            'metaDescription' => 'Published skills, education, and experience for ' . $siteName . '.',
            'canonicalPath' => '/experience',
            'skillGroups' => (new Skill())->grouped(),
            'experiences' => (new Experience())->published(),
        ]);
    }
}
