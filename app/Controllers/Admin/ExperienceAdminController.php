<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Catalog;
use App\Core\Validator;
use App\Models\Experience;
use Throwable;

class ExperienceAdminController extends AdminController
{
    private const BASE = '/admin/experience';

    public function index(): void
    {
        $search = query_string('q');
        $status = query_choice('status', ['draft', 'published']);
        $types = $this->typeOptions(null);
        $type = query_choice('type', array_keys($types));
        $model = new Experience();
        $paging = paginate($model->countSearch($search, $status, $type), query_page(), 12);

        $this->admin('admin/experience/index', [
            'title' => 'Experience | Administration',
            'nav' => self::BASE,
            'experiences' => $model->search($search, $status, $type, $paging['per_page'], $paging['offset']),
            'types' => $types,
            'search' => $search,
            'status' => $status,
            'type' => $type,
            'paging' => $paging,
            'filtering' => $search !== '' || $status !== '' || $type !== '',
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
            $id = (new Experience())->create($parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception);
            $this->form(null, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Experience saved.');
        redirect(self::BASE . '/' . $id);
    }

    public function show(array $params): void
    {
        $experience = $this->load($this->recordId($params));
        $this->admin('admin/experience/show', [
            'title' => $experience['title'] . ' | Administration',
            'nav' => self::BASE,
            'experience' => $experience,
        ]);
    }

    public function edit(array $params): void
    {
        $experience = $this->load($this->recordId($params));
        $this->form($experience, $this->fromRecord($experience), []);
    }

    public function update(array $params): void
    {
        $experience = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $experience['id'] . '/edit');
        $parsed = $this->parsed($experience);
        if ($parsed['validator']->fails()) {
            $this->form($experience, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            (new Experience())->update((int) $experience['id'], $parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception);
            $this->form($experience, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Experience updated.');
        redirect(self::BASE . '/' . $experience['id']);
    }

    public function status(array $params): void
    {
        $experience = $this->load($this->recordId($params));
        $return = $this->returnPath(self::BASE, (int) $experience['id']);
        $this->assertCsrf($return);
        $status = \App\Core\Input::text('status');
        if (!in_array($status, ['draft', 'published'], true)) {
            flash('error', 'Choose draft or published.');
            redirect($return);
        }

        (new Experience())->setStatus((int) $experience['id'], $status);
        flash('success', $status === 'published' ? 'Experience published.' : 'Experience moved to draft.');
        redirect($return);
    }

    public function confirmDelete(array $params): void
    {
        $experience = $this->load($this->recordId($params));
        $this->confirm(
            self::BASE,
            'Delete this experience?',
            (string) $experience['title'],
            'This removes the experience record from the public site.',
            self::BASE . '/' . $experience['id'] . '/delete',
            self::BASE . '/' . $experience['id']
        );
    }

    public function destroy(array $params): void
    {
        $experience = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $experience['id'] . '/delete');
        (new Experience())->delete((int) $experience['id']);
        flash('success', 'Experience deleted.');
        redirect(self::BASE);
    }

    private function load(int $id): array
    {
        $experience = (new Experience())->find($id);
        if ($experience === null) {
            $this->notFound();
        }

        return $experience;
    }

    private function form(?array $record, array $values, array $errors): void
    {
        $this->admin('admin/experience/form', [
            'title' => ($record === null ? 'New experience' : 'Edit experience') . ' | Administration',
            'nav' => self::BASE,
            'heading' => $record === null ? 'New experience' : 'Edit experience',
            'lede' => 'Use the dates you can confirm. A current role does not need an end date.',
            'action' => $record === null ? self::BASE : self::BASE . '/' . $record['id'],
            'values' => $values,
            'errors' => $errors,
            'types' => $this->typeOptions($record),
            'statuses' => Catalog::statuses(),
        ]);
    }

    private function parsed(?array $existing): array
    {
        $types = $this->typeOptions($existing);
        $v = new Validator();
        $title = $v->string('title', 'Role', 160, true);
        $organization = $v->string('organization', 'Organization', 180, true);
        $type = $v->choice('experience_type', 'Type', array_keys($types));
        $description = $v->string('description', 'Description', 8000);
        $status = $v->choice('status', 'Status', ['draft', 'published'], 'draft');
        $order = $v->order();
        $current = $v->flag('is_current');
        $start = $v->optionalDate('started_on', 'Start date');
        $end = $v->optionalDate('ended_on', 'End date');
        $label = $v->string('period_label', 'Period', 80);

        if ($current === 1 && $end !== null) {
            $v->add('ended_on', 'Clear the end date when this experience is current.');
        }
        if ($start !== null && $end !== null && $start > $end) {
            $v->add('ended_on', 'The end date must be on or after the start date.');
        }
        if ($label === '') {
            $label = $this->periodLabel($start, $end, $current === 1);
            if ($label === '') {
                $v->add('period_label', 'Add a period, or provide a start date.');
            } else {
                $v->set('period_label', $label);
            }
        }

        return [
            'validator' => $v,
            'data' => [
                'title' => $title,
                'organization' => $organization,
                'period_label' => $label,
                'started_on' => $start,
                'ended_on' => $current === 1 ? null : $end,
                'is_current' => $current,
                'description' => $description === '' ? null : $description,
                'experience_type' => $type,
                'status' => $status,
                'display_order' => $order,
            ],
        ];
    }

    private function periodLabel(?string $start, ?string $end, bool $current): string
    {
        $startLabel = $start !== null ? format_date($start, 'M Y') : '';
        $endLabel = $end !== null ? format_date($end, 'M Y') : '';
        if ($startLabel !== '' && $current) {
            return $startLabel . ' – Present';
        }
        if ($startLabel !== '' && $endLabel !== '') {
            return $startLabel . ' – ' . $endLabel;
        }
        if ($startLabel !== '') {
            return $startLabel;
        }
        if ($current) {
            return 'Present';
        }

        return '';
    }

    private function typeOptions(?array $record): array
    {
        $options = Catalog::experienceTypes();
        $current = (string) ($record['experience_type'] ?? '');
        if ($current !== '' && !isset($options[$current])) {
            $options = [$current => experience_type_label($current)] + $options;
        }

        return $options;
    }

    private function blank(): array
    {
        return [
            'title' => '',
            'organization' => '',
            'period_label' => '',
            'started_on' => '',
            'ended_on' => '',
            'is_current' => 0,
            'description' => '',
            'experience_type' => 'work',
            'status' => 'draft',
            'display_order' => '0',
        ];
    }

    private function fromRecord(array $record): array
    {
        return [
            'title' => (string) ($record['title'] ?? ''),
            'organization' => (string) ($record['organization'] ?? ''),
            'period_label' => (string) ($record['period_label'] ?? ''),
            'started_on' => (string) ($record['started_on'] ?? ''),
            'ended_on' => (string) ($record['ended_on'] ?? ''),
            'is_current' => (int) ($record['is_current'] ?? 0),
            'description' => (string) ($record['description'] ?? ''),
            'experience_type' => (string) ($record['experience_type'] ?? 'work'),
            'status' => (string) ($record['status'] ?? 'draft'),
            'display_order' => (string) ($record['display_order'] ?? '0'),
        ];
    }
}
