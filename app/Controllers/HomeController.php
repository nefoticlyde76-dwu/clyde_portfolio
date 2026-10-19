<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\DesignItem;
use App\Models\Project;
use App\Models\Skill;

class HomeController extends PublicController
{
    public function index(): void
    {
        $projects = array_map('present_project', (new Project())->selected(3));
        $skills = (new Skill())->grouped();
        $designs = array_values(array_filter(
            array_map('present_design', (new DesignItem())->published(4)),
            static fn (array $item): bool => $item['image_url'] !== ''
        ));

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
            'projects' => $projects,
            'skillGroups' => $skills,
            'designs' => $designs,
        ]);
    }
}
