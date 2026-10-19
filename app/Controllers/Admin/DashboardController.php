<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Models\Stats;

class DashboardController extends AdminController
{
    public function index(): void
    {
        $stats = new Stats();
        $counts = $stats->counts();

        $this->admin('admin/dashboard', [
            'title' => 'Overview | Administration',
            'nav' => '/admin',
            'counts' => $counts,
            'projects' => $this->presentProjects($stats->recentProjects()),
            'messages' => $this->presentMessages($stats->recentMessages()),
        ]);
    }

    private function presentProjects(array $projects): array
    {
        foreach ($projects as &$project) {
            $project['updated_label'] = format_date((string) ($project['updated_at'] ?? ''), 'j M Y');
        }
        unset($project);

        return $projects;
    }

    private function presentMessages(array $messages): array
    {
        foreach ($messages as &$message) {
            $message['created_label'] = format_date((string) ($message['created_at'] ?? ''), 'j M Y');
            $message['excerpt'] = excerpt((string) ($message['message'] ?? ''), 90);
            $message['status_label'] = (int) ($message['is_read'] ?? 0) === 1 ? 'Read' : 'Unread';
        }
        unset($message);

        return $messages;
    }
}
