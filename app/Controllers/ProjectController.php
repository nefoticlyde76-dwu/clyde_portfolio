<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Project;

class ProjectController extends PublicController
{
    public function index(): void
    {
        $projects = array_map('present_project', (new Project())->published());
        $siteName = $this->siteName();

        $this->page('public/projects/index', [
            'title' => $this->titled('Projects', $siteName),
            'metaDescription' => 'Published software and systems projects by ' . $siteName . '.',
            'canonicalPath' => '/projects',
            'projects' => $projects,
        ]);
    }

    public function show(array $params): void
    {
        $slug = (string) ($params['slug'] ?? '');
        $project = (new Project())->findPublishedBySlug($slug);
        if ($project === null) {
            (new NotFoundController())->missing();
            return;
        }

        $project = present_project($project);
        $profile = $this->profile();
        $siteName = $this->siteName();
        $description = excerpt($project['summary'], 160);

        $this->page('public/projects/show', [
            'title' => $project['title'] . ' | ' . $siteName,
            'metaDescription' => $description,
            'canonicalPath' => '/projects/' . $project['slug'],
            'ogImage' => $project['cover_url'] !== '' ? $project['cover_url'] : $profile['profile_image_url'],
            'ogType' => 'article',
            'project' => $project,
        ]);
    }
}
