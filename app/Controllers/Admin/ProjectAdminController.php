<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Catalog;
use App\Core\Upload;
use App\Core\Validator;
use App\Models\Project;
use Throwable;

class ProjectAdminController extends AdminController
{
    private const BASE = '/admin/projects';

    public function index(): void
    {
        $search = query_string('q');
        $status = query_choice('status', ['draft', 'published']);
        $model = new Project();
        $paging = paginate($model->countSearch($search, $status), query_page(), 12);

        $this->admin('admin/projects/index', [
            'title' => 'Projects | Administration',
            'nav' => self::BASE,
            'projects' => $model->search($search, $status, $paging['per_page'], $paging['offset']),
            'search' => $search,
            'status' => $status,
            'paging' => $paging,
            'filtering' => $search !== '' || $status !== '',
        ]);
    }

    public function create(): void
    {
        $this->form(null, $this->blank(), []);
    }

    public function store(): void
    {
        $this->assertCsrf(self::BASE . '/create');
        $parsed = $this->parsed(null);
        if ($parsed['validator']->fails()) {
            $this->rejectUpload($parsed);
            $this->form(null, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            $id = (new Project())->create($parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->form(null, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Project saved.');
        redirect(self::BASE . '/' . $id);
    }

    public function show(array $params): void
    {
        $project = $this->load($this->recordId($params));
        $this->admin('admin/projects/show', [
            'title' => $project['title'] . ' | Administration',
            'nav' => self::BASE,
            'project' => $project,
            'coverUrl' => media_url($project['cover_image_path'] ?? null) ?? '',
        ]);
    }

    public function edit(array $params): void
    {
        $project = $this->load($this->recordId($params));
        $this->form($project, $this->fromRecord($project), []);
    }

    public function update(array $params): void
    {
        $project = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $project['id'] . '/edit');
        $parsed = $this->parsed($project);
        if ($parsed['validator']->fails()) {
            $this->rejectUpload($parsed);
            $this->form($project, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            (new Project())->update((int) $project['id'], $parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->form($project, $parsed['validator']->values(), []);
            return;
        }

        if ($parsed['previous_file'] !== $parsed['data']['cover_image_path']) {
            release_upload($parsed['previous_file']);
        }

        flash('success', 'Project updated.');
        redirect(self::BASE . '/' . $project['id']);
    }

    public function status(array $params): void
    {
        $project = $this->load($this->recordId($params));
        $return = $this->returnPath(self::BASE, (int) $project['id']);
        $this->assertCsrf($return);
        $status = \App\Core\Input::text('status');
        if (!in_array($status, ['draft', 'published'], true)) {
            flash('error', 'Choose draft or published.');
            redirect($return);
        }

        (new Project())->setStatus((int) $project['id'], $status);
        flash('success', $status === 'published' ? 'Project published.' : 'Project moved to draft.');
        redirect($return);
    }

    public function confirmDelete(array $params): void
    {
        $project = $this->load($this->recordId($params));
        $this->confirm(
            self::BASE,
            'Delete this project?',
            (string) $project['title'],
            'This removes the project from the database. A draft or published page for it will no longer be available. Its cover image is deleted if no other record uses that file.',
            self::BASE . '/' . $project['id'] . '/delete',
            self::BASE . '/' . $project['id']
        );
    }

    public function destroy(array $params): void
    {
        $project = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $project['id'] . '/delete');
        $cover = is_string($project['cover_image_path'] ?? null) ? $project['cover_image_path'] : null;
        (new Project())->delete((int) $project['id']);
        release_upload($cover);
        flash('success', 'Project deleted.');
        redirect(self::BASE);
    }

    private function load(int $id): array
    {
        $project = (new Project())->find($id);
        if ($project === null) {
            $this->notFound();
        }

        return $project;
    }

    private function form(?array $record, array $values, array $errors): void
    {
        $this->admin('admin/projects/form', [
            'title' => ($record === null ? 'New project' : 'Edit project') . ' | Administration',
            'nav' => self::BASE,
            'heading' => $record === null ? 'New project' : 'Edit project',
            'lede' => 'Draft projects stay off the public site.',
            'action' => $record === null ? self::BASE : self::BASE . '/' . $record['id'],
            'values' => $values,
            'errors' => $errors,
            'preview' => media_url($record['cover_image_path'] ?? null) ?? '',
            'statuses' => Catalog::statuses(),
        ]);
    }

    private function parsed(?array $existing): array
    {
        $v = new Validator();
        $title = $v->string('title', 'Title', 160, true);
        $slug = $v->slug('slug', 'title');
        $category = $v->string('category', 'Category', 80, true);
        $summary = $v->string('summary', 'Short description', 500, true);
        $overview = $v->string('overview', 'Overview', 8000);
        $purpose = $v->string('purpose', 'Problem or purpose', 8000);
        $role = $v->string('role', 'Role', 180);
        $contribution = $v->string('contribution', 'Contribution', 8000);
        $solution = $v->string('solution', 'Solution', 8000);
        $technologies = $v->string('technologies', 'Technologies', 500);
        $features = $v->string('features', 'Features', 8000);
        $lessons = $v->string('lessons', 'Challenges and lessons', 8000);
        $live = $v->optionalUrl('live_url', 'Live URL');
        $repository = $v->optionalUrl('repository_url', 'Repository URL');
        $featured = $v->flag('is_featured');
        $status = $v->choice('status', 'Status', ['draft', 'published'], 'draft');
        $order = $v->order();
        $upload = Upload::take('cover_image', 'projects', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        if ($upload['error'] !== null) {
            $v->add('cover_image', $upload['error']);
        }

        $previous = $this->storedPath($existing['cover_image_path'] ?? null);
        $path = $v->flag('remove_cover') === 1 ? null : $previous;
        if ($upload['path'] !== null) {
            $path = $upload['path'];
        }

        if ($slug !== '' && (new Project())->slugTaken($slug, (int) ($existing['id'] ?? 0))) {
            $v->add('slug', 'That slug is already used.');
        }

        return [
            'validator' => $v,
            'new_file' => $upload['path'],
            'previous_file' => $previous,
            'data' => [
                'title' => $title,
                'slug' => $slug,
                'category' => $category,
                'summary' => $summary,
                'overview' => $this->nullable($overview),
                'purpose' => $this->nullable($purpose),
                'role' => $this->nullable($role),
                'contribution' => $this->nullable($contribution),
                'solution' => $this->nullable($solution),
                'technologies' => $this->nullable($technologies),
                'features' => $this->nullable($features),
                'lessons' => $this->nullable($lessons),
                'description' => $this->nullable($purpose),
                'live_url' => $live,
                'repository_url' => $repository,
                'cover_image_path' => $path,
                'is_featured' => $featured,
                'status' => $status,
                'display_order' => $order,
            ],
        ];
    }

    private function rejectUpload(array $parsed): void
    {
        if ($parsed['new_file'] !== null && !isset($parsed['validator']->errors()['cover_image'])) {
            $parsed['validator']->add('cover_image', 'Choose the cover image again after fixing the other fields.');
        }
        release_upload($parsed['new_file']);
    }

    private function blank(): array
    {
        return $this->fromRecord([
            'title' => '',
            'slug' => '',
            'category' => '',
            'summary' => '',
            'overview' => '',
            'purpose' => '',
            'role' => '',
            'contribution' => '',
            'solution' => '',
            'technologies' => '',
            'features' => '',
            'lessons' => '',
            'live_url' => '',
            'repository_url' => '',
            'is_featured' => 0,
            'status' => 'draft',
            'display_order' => 0,
        ]);
    }

    private function fromRecord(array $record): array
    {
        return [
            'title' => (string) ($record['title'] ?? ''),
            'slug' => (string) ($record['slug'] ?? ''),
            'category' => (string) ($record['category'] ?? ''),
            'summary' => (string) ($record['summary'] ?? ''),
            'overview' => (string) ($record['overview'] ?? ''),
            'purpose' => (string) ($record['purpose'] ?? ''),
            'role' => (string) ($record['role'] ?? ''),
            'contribution' => (string) ($record['contribution'] ?? ''),
            'solution' => (string) ($record['solution'] ?? ''),
            'technologies' => (string) ($record['technologies'] ?? ''),
            'features' => (string) ($record['features'] ?? ''),
            'lessons' => (string) ($record['lessons'] ?? ''),
            'live_url' => (string) ($record['live_url'] ?? ''),
            'repository_url' => (string) ($record['repository_url'] ?? ''),
            'is_featured' => (int) ($record['is_featured'] ?? 0),
            'status' => (string) ($record['status'] ?? 'draft'),
            'display_order' => (string) ($record['display_order'] ?? '0'),
        ];
    }

    private function nullable(string $value): ?string
    {
        return $value === '' ? null : $value;
    }

    private function storedPath(mixed $path): ?string
    {
        return is_string($path) && $path !== '' ? $path : null;
    }
}
