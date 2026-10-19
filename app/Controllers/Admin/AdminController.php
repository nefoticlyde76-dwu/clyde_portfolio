<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Input;
use Throwable;

abstract class AdminController extends Controller
{
    public function __construct()
    {
        require_auth();
    }

    protected function admin(string $view, array $data = []): void
    {
        $data['admin'] = auth_admin();
        $this->render($view, $data, 'layouts/admin');
    }

    protected function recordId(array $params): int
    {
        $id = (string) ($params['id'] ?? '');
        if (!preg_match('/^[1-9][0-9]{0,9}$/', $id)) {
            $this->notFound();
        }

        return (int) $id;
    }

    protected function notFound(): never
    {
        http_response_code(404);
        $this->admin('admin/missing', [
            'title' => 'Not found | Administration',
            'nav' => '/admin',
            'heading' => 'Record not found',
            'lede' => 'That record does not exist, or it has already been removed.',
        ]);
        exit;
    }

    protected function assertCsrf(string $redirect): void
    {
        $token = $_POST['_csrf'] ?? null;
        if (!csrf_validate(is_string($token) ? $token : null)) {
            flash('error', 'The form expired. Submit it again.');
            redirect($redirect);
        }
    }

    protected function returnPath(string $base, int $id): string
    {
        $return = Input::text('return');
        $allowed = [$base, $base . '/' . $id];

        return in_array($return, $allowed, true) ? $return : $base . '/' . $id;
    }

    protected function couldNotSave(Throwable $exception, ?string $newFile = null): void
    {
        app_log($exception->getMessage());
        release_upload($newFile);
        flash('error', 'The record could not be saved.');
    }

    protected function confirm(string $nav, string $heading, string $lede, string $message, string $action, string $return): void
    {
        $this->admin('admin/confirm', [
            'title' => $heading . ' | Administration',
            'nav' => $nav,
            'heading' => $heading,
            'lede' => $lede,
            'message' => $message,
            'action' => $action,
            'return' => $return,
        ]);
    }
}
