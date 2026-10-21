<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Experience;
use App\Models\Project;
use App\Models\Skill;

class HomeController extends PublicController
{
    public function index(): void
    {
        $published = (new Project())->published();
        $liveCount = 0;
        foreach ($published as $project) {
            if (safe_url($project['live_url'] ?? null) !== null) {
                $liveCount++;
            }
        }

        $education = array_values(array_filter(
            (new Experience())->published(),
            static fn (array $row): bool => ($row['experience_type'] ?? '') === 'education'
        ));

        $skillNames = [];
        foreach ((new Skill())->grouped() as $skills) {
            foreach ($skills as $skill) {
                $name = trim((string) ($skill['name'] ?? ''));
                if ($name !== '') {
                    $skillNames[] = $name;
                }
            }
        }

        $profile = $this->profile();
        $siteName = $this->siteName();
        $title = $profile['seo_title'] !== '' ? $profile['seo_title'] : trim($siteName . ' | ' . $profile['headline'], ' |');
        $description = $profile['seo_description'] !== ''
            ? $profile['seo_description']
            : excerpt($profile['introduction'], 160);

        $this->page('public/home', [
            'title' => $title,
            'metaDescription' => $description,
            'canonicalPath' => '/',
            'ogImage' => $profile['profile_image_url'],
            'projects' => array_map('present_project', array_slice($published, 0, 3)),
            'publishedCount' => count($published),
            'liveCount' => $liveCount,
            'education' => $education,
            'skillNames' => $skillNames,
            'steps' => [
                ['number' => '01', 'title' => 'Discover', 'text' => 'Understand the project, audience, objectives, and requirements.', 'icon' => 'search'],
                ['number' => '02', 'title' => 'Define', 'text' => 'Plan the structure, user journeys, wireframes, and overall direction.', 'icon' => 'map'],
                ['number' => '03', 'title' => 'Design', 'text' => 'Create the visual system, interface, and user experience.', 'icon' => 'pen'],
                ['number' => '04', 'title' => 'Develop', 'text' => 'Build a responsive, accessible, high-quality implementation.', 'icon' => 'code'],
                ['number' => '05', 'title' => 'Deliver', 'text' => 'Test, refine, optimize, and prepare the finished project for launch.', 'icon' => 'send'],
            ],
            'statement' => 'A system should be clear to use, carefully documented, and ready for the people it is meant to serve.',
        ]);
    }
}
