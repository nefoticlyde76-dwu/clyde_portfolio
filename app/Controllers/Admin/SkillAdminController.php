<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Catalog;
use App\Core\Validator;
use App\Models\Skill;
use Throwable;

class SkillAdminController extends AdminController
{
    private const BASE = '/admin/skills';

    public function index(): void
    {
        $search = query_string('q');
        $status = query_choice('status', ['draft', 'published']);
        $model = new Skill();
        $categories = $this->categoryOptions(null);
        $category = query_string('category', 80);
        if ($category !== '' && !isset($categories[$category])) {
            $category = '';
        }
        $paging = paginate($model->countSearch($search, $status, $category), query_page(), 20);

        $this->admin('admin/skills/index', [
            'title' => 'Skills | Administration',
            'nav' => self::BASE,
            'skills' => $model->search($search, $status, $category, $paging['per_page'], $paging['offset']),
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
            $this->form(null, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            $id = (new Skill())->create($parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception);
            $this->form(null, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Skill saved.');
        redirect(self::BASE . '/' . $id);
    }

    public function show(array $params): void
    {
        $skill = $this->load($this->recordId($params));
        $this->admin('admin/skills/show', [
            'title' => $skill['name'] . ' | Administration',
            'nav' => self::BASE,
            'skill' => $skill,
        ]);
    }

    public function edit(array $params): void
    {
        $skill = $this->load($this->recordId($params));
        $this->form($skill, $this->fromRecord($skill), []);
    }

    public function update(array $params): void
    {
        $skill = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $skill['id'] . '/edit');
        $parsed = $this->parsed($skill);
        if ($parsed['validator']->fails()) {
            $this->form($skill, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            (new Skill())->update((int) $skill['id'], $parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception);
            $this->form($skill, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Skill updated.');
        redirect(self::BASE . '/' . $skill['id']);
    }

    public function status(array $params): void
    {
        $skill = $this->load($this->recordId($params));
        $return = $this->returnPath(self::BASE, (int) $skill['id']);
        $this->assertCsrf($return);
        $status = \App\Core\Input::text('status');
        if (!in_array($status, ['draft', 'published'], true)) {
            flash('error', 'Choose draft or published.');
            redirect($return);
        }

        (new Skill())->setStatus((int) $skill['id'], $status);
        flash('success', $status === 'published' ? 'Skill published.' : 'Skill moved to draft.');
        redirect($return);
    }

    public function confirmDelete(array $params): void
    {
        $skill = $this->load($this->recordId($params));
        $this->confirm(
            self::BASE,
            'Delete this skill?',
            (string) $skill['name'],
            'This removes the skill from the public skills list.',
            self::BASE . '/' . $skill['id'] . '/delete',
            self::BASE . '/' . $skill['id']
        );
    }

    public function destroy(array $params): void
    {
        $skill = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $skill['id'] . '/delete');
        (new Skill())->delete((int) $skill['id']);
        flash('success', 'Skill deleted.');
        redirect(self::BASE);
    }

    private function load(int $id): array
    {
        $skill = (new Skill())->find($id);
        if ($skill === null) {
            $this->notFound();
        }

        return $skill;
    }

    private function form(?array $record, array $values, array $errors): void
    {
        $this->admin('admin/skills/form', [
            'title' => ($record === null ? 'New skill' : 'Edit skill') . ' | Administration',
            'nav' => self::BASE,
            'heading' => $record === null ? 'New skill' : 'Edit skill',
            'lede' => 'Skills are names in a category. Proficiency percentages are not used.',
            'action' => $record === null ? self::BASE : self::BASE . '/' . $record['id'],
            'values' => $values,
            'errors' => $errors,
            'categories' => $this->categoryOptions($record),
            'statuses' => Catalog::statuses(),
        ]);
    }

    private function parsed(?array $existing): array
    {
        $categories = $this->categoryOptions($existing);
        $v = new Validator();
        $name = $v->string('name', 'Skill', 120, true);
        $category = $v->choice('category', 'Category', array_keys($categories));
        $status = $v->choice('status', 'Status', ['draft', 'published'], 'draft');
        $order = $v->order();

        if ($name !== '' && $category !== '' && (new Skill())->nameTaken($category, $name, (int) ($existing['id'] ?? 0))) {
            $v->add('name', 'That skill is already in this category.');
        }

        return [
            'validator' => $v,
            'data' => [
                'name' => $name,
                'category' => $category,
                'display_order' => $order,
                'status' => $status,
            ],
        ];
    }

    private function categoryOptions(?array $record): array
    {
        $names = Catalog::skillCategories();
        $options = array_combine($names, $names) ?: [];
        foreach ((new Skill())->categoriesInUse() as $category) {
            $category = (string) $category;
            if ($category !== '' && !isset($options[$category])) {
                $options[$category] = $category;
            }
        }
        $current = (string) ($record['category'] ?? '');
        if ($current !== '' && !isset($options[$current])) {
            $options = [$current => $current] + $options;
        }

        return $options;
    }

    private function blank(): array
    {
        return [
            'name' => '',
            'category' => 'Programming Languages',
            'status' => 'draft',
            'display_order' => '0',
        ];
    }

    private function fromRecord(array $record): array
    {
        return [
            'name' => (string) ($record['name'] ?? ''),
            'category' => (string) ($record['category'] ?? ''),
            'status' => (string) ($record['status'] ?? 'draft'),
            'display_order' => (string) ($record['display_order'] ?? '0'),
        ];
    }
}
