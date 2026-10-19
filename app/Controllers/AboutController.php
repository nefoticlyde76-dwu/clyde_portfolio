<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Experience;
use App\Models\Skill;

class AboutController extends PublicController
{
    public function index(): void
    {
        $experiences = (new Experience())->published();
        $education = [];
        $selected = [];
        foreach ($experiences as $experience) {
            if (($experience['experience_type'] ?? '') === 'education') {
                $education[] = $experience;
            } else {
                $selected[] = $experience;
            }
        }

        $categories = array_keys((new Skill())->grouped());
        $profile = $this->profile();
        $siteName = $this->siteName();

        $this->page('public/about', [
            'title' => $this->titled('About', $siteName),
            'metaDescription' => excerpt($profile['biography'] !== '' ? $profile['biography'] : $profile['introduction'], 160),
            'canonicalPath' => '/about',
            'ogImage' => $profile['profile_image_url'],
            'education' => $education,
            'selectedExperience' => $selected,
            'interests' => $categories,
        ]);
    }
}
