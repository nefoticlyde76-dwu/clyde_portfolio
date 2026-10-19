<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Models\Admin;
use PDOException;

class AuthController extends \App\Core\Controller
{
    /**
     * Used only to keep failed lookups on a similar password_verify() path.
     * This is not an account password.
     */
    private const DUMMY_PASSWORD_HASH = '$2y$10$Ets9W/7lsUY0ltEEp/0xguygaQmSG.4Td/ICC/hC50oalnOd.DS7a';

    public function showLogin(): void
    {
        if (auth_check()) {
            redirect('/admin');
        }

        $this->render('admin/login', [
            'title' => 'Administrator sign in',
        ], 'layouts/admin-guest');
    }

    public function login(): void
    {
        if (!csrf_validate(isset($_POST['_csrf']) ? (string) $_POST['_csrf'] : null)) {
            flash('error', 'The form expired. Submit it again.');
            redirect('/admin/login');
        }

        $ip = client_ip();
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');
        $isEmail = filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
        $isUsername = preg_match('/^[a-z0-9][a-z0-9._-]{1,39}$/', $email) === 1;

        if (login_throttle_blocked($ip)) {
            password_verify($password !== '' ? $password : 'placeholder', self::DUMMY_PASSWORD_HASH);
            flash('error', 'Please wait a few minutes before trying again.');
            redirect('/admin/login');
        }

        if ((!$isEmail && !$isUsername) || $password === '') {
            $this->reject($ip);
        }

        try {
            $admin = (new Admin())->findByEmail($email);
        } catch (PDOException $exception) {
            app_log('Administrator sign-in could not query the database: ' . $exception->getMessage());
            $message = app_config()['environment'] === 'development'
                ? 'Sign-in could not be completed. Check that MySQL is running and the database has been imported.'
                : 'Sign-in is unavailable right now.';
            flash('error', $message);
            redirect('/admin/login');
        }

        $hash = is_array($admin) ? (string) ($admin['password_hash'] ?? '') : self::DUMMY_PASSWORD_HASH;
        $valid = $hash !== '' && password_verify($password, $hash);

        if (!is_array($admin) || !$valid) {
            $this->reject($ip);
        }

        login_throttle_clear($ip);
        auth_login($admin);
        flash('success', 'Signed in.');
        redirect('/admin');
    }

    public function logout(): void
    {
        if (!auth_check()) {
            redirect('/admin/login');
        }

        if (!csrf_validate(isset($_POST['_csrf']) ? (string) $_POST['_csrf'] : null)) {
            flash('error', 'The form expired. Submit it again.');
            redirect('/admin');
        }

        auth_logout();
        flash('success', 'Signed out.');
        redirect('/admin/login');
    }

    private function reject(string $ip): never
    {
        login_throttle_hit($ip);
        flash('error', 'Those sign-in details were not recognised.');
        redirect('/admin/login');
    }
}
