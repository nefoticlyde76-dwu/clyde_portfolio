<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Catalog;
use App\Core\Upload;
use App\Core\Validator;
use App\Models\Certificate;
use Throwable;

class CertificateAdminController extends AdminController
{
    private const BASE = '/admin/certificates';

    public function index(): void
    {
        $search = query_string('q');
        $status = query_choice('status', ['draft', 'published']);
        $model = new Certificate();
        $paging = paginate($model->countSearch($search, $status), query_page(), 12);

        $this->admin('admin/certificates/index', [
            'title' => 'Certificates | Administration',
            'nav' => self::BASE,
            'certificates' => $model->search($search, $status, $paging['per_page'], $paging['offset']),
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
            $id = (new Certificate())->create($parsed['data']);
        } catch (Throwable $exception) {
            release_upload($parsed['new_image']);
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->form(null, $parsed['validator']->values(), []);
            return;
        }

        flash('success', 'Certificate saved.');
        redirect(self::BASE . '/' . $id);
    }

    public function show(array $params): void
    {
        $certificate = $this->load($this->recordId($params));
        $this->admin('admin/certificates/show', [
            'title' => $certificate['title'] . ' | Administration',
            'nav' => self::BASE,
            'certificate' => $certificate,
            'fileUrl' => media_url($certificate['file_path'] ?? null) ?? '',
            'imageUrl' => media_url($certificate['display_image_path'] ?? null) ?? '',
        ]);
    }

    public function edit(array $params): void
    {
        $certificate = $this->load($this->recordId($params));
        $this->form($certificate, $this->fromRecord($certificate), []);
    }

    public function update(array $params): void
    {
        $certificate = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $certificate['id'] . '/edit');
        $parsed = $this->parsed($certificate);
        if ($parsed['validator']->fails()) {
            $this->rejectUpload($parsed);
            $this->form($certificate, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            (new Certificate())->update((int) $certificate['id'], $parsed['data']);
        } catch (Throwable $exception) {
            release_upload($parsed['new_image']);
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->form($certificate, $parsed['validator']->values(), []);
            return;
        }

        if ($parsed['previous_file'] !== $parsed['data']['file_path']) {
            release_upload($parsed['previous_file']);
        }
        if ($parsed['previous_image'] !== $parsed['data']['display_image_path']) {
            release_upload($parsed['previous_image']);
        }

        flash('success', 'Certificate updated.');
        redirect(self::BASE . '/' . $certificate['id']);
    }

    public function status(array $params): void
    {
        $certificate = $this->load($this->recordId($params));
        $return = $this->returnPath(self::BASE, (int) $certificate['id']);
        $this->assertCsrf($return);
        $status = \App\Core\Input::text('status');
        if (!in_array($status, ['draft', 'published'], true)) {
            flash('error', 'Choose draft or published.');
            redirect($return);
        }

        (new Certificate())->setStatus((int) $certificate['id'], $status);
        flash('success', $status === 'published' ? 'Certificate published.' : 'Certificate moved to draft.');
        redirect($return);
    }

    public function confirmDelete(array $params): void
    {
        $certificate = $this->load($this->recordId($params));
        $this->confirm(
            self::BASE,
            'Delete this certificate?',
            (string) $certificate['title'],
            'This removes the saved certificate record. Its file and display image are deleted if no other record uses them.',
            self::BASE . '/' . $certificate['id'] . '/delete',
            self::BASE . '/' . $certificate['id']
        );
    }

    public function destroy(array $params): void
    {
        $certificate = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $certificate['id'] . '/delete');
        $file = is_string($certificate['file_path'] ?? null) ? $certificate['file_path'] : null;
        $image = is_string($certificate['display_image_path'] ?? null) ? $certificate['display_image_path'] : null;
        (new Certificate())->delete((int) $certificate['id']);
        release_upload($file);
        release_upload($image);
        flash('success', 'Certificate deleted.');
        redirect(self::BASE);
    }

    private function load(int $id): array
    {
        $certificate = (new Certificate())->find($id);
        if ($certificate === null) {
            $this->notFound();
        }

        return $certificate;
    }

    private function form(?array $record, array $values, array $errors): void
    {
        $this->admin('admin/certificates/form', [
            'title' => ($record === null ? 'New certificate' : 'Edit certificate') . ' | Administration',
            'nav' => self::BASE,
            'heading' => $record === null ? 'New certificate' : 'Edit certificate',
            'lede' => 'Save only certificates you can document. Leave the issue date blank when it is unknown. A display image is the public card, and the card opens this certificate.',
            'action' => $record === null ? self::BASE : self::BASE . '/' . $record['id'],
            'values' => $values,
            'errors' => $errors,
            'preview' => media_url(is_array($record) ? ($record['file_path'] ?? null) : null) ?? '',
            'imagePreview' => media_url(is_array($record) ? ($record['display_image_path'] ?? null) : null) ?? '',
            'statuses' => Catalog::statuses(),
        ]);
    }

    private function parsed(?array $existing): array
    {
        $v = new Validator();
        $title = $v->string('title', 'Title', 180, true);
        $issuer = $v->string('issuing_organization', 'Issuer', 180, true);
        $issued = $v->optionalDate('issued_on', 'Issue date');
        $credentialId = $v->string('credential_id', 'Credential ID', 120);
        $credentialUrl = $v->optionalUrl('credential_url', 'Credential URL');
        $description = $v->string('description', 'Description', 8000);
        $status = $v->choice('status', 'Status', ['draft', 'published'], 'draft');
        $order = $v->order();
        $upload = Upload::take('certificate_file', 'certificates', ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf']);
        if ($upload['error'] !== null) {
            $v->add('certificate_file', $upload['error']);
        }
        $image = Upload::take('display_image', 'certificates', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        if ($image['error'] !== null) {
            $v->add('display_image', $image['error']);
        }

        $previous = is_string($existing['file_path'] ?? null) && $existing['file_path'] !== '' ? $existing['file_path'] : null;
        $path = $v->flag('remove_file') === 1 ? null : $previous;
        if ($upload['path'] !== null) {
            $path = $upload['path'];
        }

        $previousImage = is_string($existing['display_image_path'] ?? null) && $existing['display_image_path'] !== '' ? $existing['display_image_path'] : null;
        $imagePath = $v->flag('remove_image') === 1 ? null : $previousImage;
        if ($image['path'] !== null) {
            $imagePath = $image['path'];
        }

        $storedId = $credentialId === '' ? null : $credentialId;
        if ($storedId !== null && (new Certificate())->credentialTaken($storedId, (int) ($existing['id'] ?? 0))) {
            $v->add('credential_id', 'That credential ID is already used.');
        }

        return [
            'validator' => $v,
            'new_file' => $upload['path'],
            'new_image' => $image['path'],
            'previous_file' => $previous,
            'previous_image' => $previousImage,
            'data' => [
                'title' => $title,
                'issuing_organization' => $issuer,
                'issued_on' => $issued,
                'credential_url' => $credentialUrl,
                'credential_id' => $storedId,
                'file_path' => $path,
                'display_image_path' => $imagePath,
                'description' => $description === '' ? null : $description,
                'status' => $status,
                'display_order' => $order,
            ],
        ];
    }

    private function rejectUpload(array $parsed): void
    {
        if ($parsed['new_file'] !== null && !isset($parsed['validator']->errors()['certificate_file'])) {
            $parsed['validator']->add('certificate_file', 'Choose the file again after fixing the other fields.');
        }
        if ($parsed['new_image'] !== null && !isset($parsed['validator']->errors()['display_image'])) {
            $parsed['validator']->add('display_image', 'Choose the display image again after fixing the other fields.');
        }
        release_upload($parsed['new_file']);
        release_upload($parsed['new_image']);
    }

    private function blank(): array
    {
        return $this->fromRecord([
            'title' => '',
            'issuing_organization' => '',
            'issued_on' => '',
            'credential_id' => '',
            'credential_url' => '',
            'description' => '',
            'status' => 'draft',
            'display_order' => 0,
        ]);
    }

    private function fromRecord(array $record): array
    {
        return [
            'title' => (string) ($record['title'] ?? ''),
            'issuing_organization' => (string) ($record['issuing_organization'] ?? ''),
            'issued_on' => (string) ($record['issued_on'] ?? ''),
            'credential_id' => (string) ($record['credential_id'] ?? ''),
            'credential_url' => (string) ($record['credential_url'] ?? ''),
            'description' => (string) ($record['description'] ?? ''),
            'status' => (string) ($record['status'] ?? 'draft'),
            'display_order' => (string) ($record['display_order'] ?? '0'),
        ];
    }
}
