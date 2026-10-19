<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Input;
use App\Models\ContactMessage;

class MessageAdminController extends AdminController
{
    private const BASE = '/admin/messages';

    public function index(): void
    {
        $search = query_string('q');
        $read = query_choice('read', ['read', 'unread']);
        $model = new ContactMessage();
        $paging = paginate($model->countSearch($search, $read), query_page(), 15);

        $this->admin('admin/messages/index', [
            'title' => 'Contact messages | Administration',
            'nav' => self::BASE,
            'messages' => $model->search($search, $read, $paging['per_page'], $paging['offset']),
            'search' => $search,
            'read' => $read,
            'paging' => $paging,
            'filtering' => $search !== '' || $read !== '',
        ]);
    }

    public function show(array $params): void
    {
        $message = $this->load($this->recordId($params));
        $this->admin('admin/messages/show', [
            'title' => 'Message | Administration',
            'nav' => self::BASE,
            'message' => $message,
        ]);
    }

    public function read(array $params): void
    {
        $message = $this->load($this->recordId($params));
        $return = $this->returnPath(self::BASE, (int) $message['id']);
        $this->assertCsrf($return);
        $flag = Input::text('is_read');
        if (!in_array($flag, ['0', '1'], true)) {
            flash('error', 'The message status could not be changed.');
            redirect($return);
        }

        (new ContactMessage())->setRead((int) $message['id'], $flag === '1' ? 1 : 0);
        flash('success', $flag === '1' ? 'Message marked read.' : 'Message marked unread.');
        redirect($return);
    }

    public function confirmDelete(array $params): void
    {
        $message = $this->load($this->recordId($params));
        $this->confirm(
            self::BASE,
            'Delete this message?',
            (string) $message['subject'],
            'This permanently removes the saved message. It does not send an email.',
            self::BASE . '/' . $message['id'] . '/delete',
            self::BASE . '/' . $message['id']
        );
    }

    public function destroy(array $params): void
    {
        $message = $this->load($this->recordId($params));
        $this->assertCsrf(self::BASE . '/' . $message['id'] . '/delete');
        (new ContactMessage())->delete((int) $message['id']);
        flash('success', 'Message deleted.');
        redirect(self::BASE);
    }

    private function load(int $id): array
    {
        $message = (new ContactMessage())->find($id);
        if ($message === null) {
            $this->notFound();
        }

        return $message;
    }
}
