<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Catalog;
use App\Core\Input;
use App\Core\Upload;
use App\Core\Validator;
use App\Models\DesignItem;
use Throwable;

class DesignAdminController extends AdminController
{
    private const BASE = '/admin/designs';

    public function index(): void
    {
        $search = query_string('q');
        $status = query_choice('status', ['draft', 'published']);
        $category = query_string('category', 80);
        $model = new DesignItem();
        $categories = $model->categories();
        if ($category !== '' && !in_array($category, $categories, true)) {
            $category = '';
        }
        $paging = paginate($model->countSearch($search, $status, $category), query_page(), 12);

        $this->admin('admin/designs/index', [
            'title' => 'Graphic designs | Administration',
            'nav' => self::BASE,
            'designs' => $model->search($search, $status, $category, $paging['per_page'], $paging['offset']),
            'categories' => $categories,
            'search' => $search,
            'status' => $status,
            'category' => $category,
            'paging' => $paging,
            'filtering' => $search !== '' || $status !== '' || $category !== '',
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
            $id = (new DesignItem())->create($parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->form(null, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Design piece saved.');
        redirect(self::BASE . '/' . $id);
    }

    public function show(array $params): void
    {
        $design = $this->load($this->recordId($params));
        $this->admin('admin/designs/show', [
            'title' => $design['title'] . ' | Administration',
            'nav' => self::BASE,
            'design' => $design,
            'imageUrl' => media_url($design['image_path'] ?? null) ?? '',
        ]);
    }

    public function edit(array $params): void
    {
        $design = $this->load($this->recordId($params));
        $this->form($design, $this->fromRecord($design), []);
    }

    public function update(array $params): void
    {
        $design = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $design['id'] . '/edit');
        $parsed = $this->parsed($design);
        if ($parsed['validator']->fails()) {
            $this->rejectUpload($parsed);
            $this->form($design, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            (new DesignItem())->update((int) $design['id'], $parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->form($design, $parsed['validator']->values(), []);
            return;
        }

        if ($parsed['previous_file'] !== $parsed['data']['image_path']) {
            release_upload($parsed['previous_file']);
        }

        flash('success', 'Design piece updated.');
        redirect(self::BASE . '/' . $design['id']);
    }

    public function status(array $params): void
    {
        $design = $this->load($this->recordId($params));
        $return = $this->returnPath(self::BASE, (int) $design['id']);
        $this->assertCsrf($return);
        $status = Input::text('status');
        if (!in_array($status, ['draft', 'published'], true)) {
            flash('error', 'Choose draft or published.');
            redirect($return);
        }

        if ($status === 'published' && media_url($design['image_path'] ?? null) === null) {
            flash('error', 'Add an image before publishing this piece.');
            redirect($return);
        }

        (new DesignItem())->setStatus((int) $design['id'], $status);
        flash('success', $status === 'published' ? 'Design piece published.' : 'Design piece moved to draft.');
        redirect($return);
    }

    public function confirmDelete(array $params): void
    {
        $design = $this->load($this->recordId($params));
        $this->confirm(
            self::BASE,
            'Delete this design piece?',
            (string) $design['title'],
            'This removes the design record. Its image is deleted if no other record uses that file.',
            self::BASE . '/' . $design['id'] . '/delete',
            self::BASE . '/' . $design['id']
        );
    }

    public function destroy(array $params): void
    {
        $design = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $design['id'] . '/delete');
        $image = is_string($design['image_path'] ?? null) ? $design['image_path'] : null;
        (new DesignItem())->delete((int) $design['id']);
        release_upload($image);
        flash('success', 'Design piece deleted.');
        redirect(self::BASE);
    }

    private function load(int $id): array
    {
        $design = (new DesignItem())->find($id);
        if ($design === null) {
            $this->notFound();
        }

        return $design;
    }

    private function form(?array $record, array $values, array $errors): void
    {
        $this->admin('admin/designs/form', [
            'title' => ($record === null ? 'New design' : 'Edit design') . ' | Administration',
            'nav' => self::BASE,
            'heading' => $record === null ? 'New design' : 'Edit design',
            'lede' => 'A piece can be published only after an image is saved.',
            'action' => $record === null ? self::BASE : self::BASE . '/' . $record['id'],
            'values' => $values,
            'errors' => $errors,
            'preview' => media_url($record['image_path'] ?? null) ?? '',
            'statuses' => Catalog::statuses(),
        ]);
    }

    private function parsed(?array $existing): array
    {
        $v = new Validator();
        $title = $v->string('title', 'Title', 160, true);
        $category = $v->string('category', 'Category', 80, true);
        $description = $v->string('description', 'Description', 8000);
        $external = $v->optionalUrl('external_url', 'External link');
        $featured = $v->flag('is_featured');
        $status = $v->choice('status', 'Status', ['draft', 'published'], 'draft');
        $order = $v->order();
        $upload = Upload::take('design_image', 'designs', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        if ($upload['error'] !== null) {
            $v->add('design_image', $upload['error']);
        }

        $previous = is_string($existing['image_path'] ?? null) && $existing['image_path'] !== '' ? $existing['image_path'] : null;
        $path = $v->flag('remove_image') === 1 ? null : $previous;
        if ($upload['path'] !== null) {
            $path = $upload['path'];
        }

        if ($status === 'published' && media_url($path) === null) {
            $v->add('design_image', 'Add an image before publishing. Drafts can be saved without one.');
        }

        return [
            'validator' => $v,
            'new_file' => $upload['path'],
            'previous_file' => $previous,
            'data' => [
                'title' => $title,
                'category' => $category,
                'description' => $description === '' ? null : $description,
                'image_path' => $path,
                'external_url' => $external,
                'is_featured' => $featured,
                'status' => $status,
                'display_order' => $order,
            ],
        ];
    }

    private function rejectUpload(array $parsed): void
    {
        if ($parsed['new_file'] !== null && !isset($parsed['validator']->errors()['design_image'])) {
            $parsed['validator']->add('design_image', 'Choose the image again after fixing the other fields.');
        }
        release_upload($parsed['new_file']);
    }

    private function blank(): array
    {
        return $this->fromRecord([
            'title' => '',
            'category' => '',
            'description' => '',
            'external_url' => '',
            'is_featured' => 0,
            'status' => 'draft',
            'display_order' => 0,
        ]);
    }

    private function fromRecord(array $record): array
    {
        return [
            'title' => (string) ($record['title'] ?? ''),
            'category' => (string) ($record['category'] ?? ''),
            'description' => (string) ($record['description'] ?? ''),
            'external_url' => (string) ($record['external_url'] ?? ''),
            'is_featured' => (int) ($record['is_featured'] ?? 0),
            'status' => (string) ($record['status'] ?? 'draft'),
            'display_order' => (string) ($record['display_order'] ?? '0'),
        ];
    }
}
