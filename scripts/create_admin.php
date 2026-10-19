<?php

declare(strict_types=1);

/**
 * Creates an administrator from the command line.
 * Run: C:\xampp\php\php.exe scripts\create_admin.php
 */

use App\Models\Admin;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/app/Core/bootstrap.php';

$name = cli_ask('Your name: ');
$email = strtolower(cli_ask('Sign-in username (email address): '));
fwrite(STDOUT, "Password input is visible in this window.\n");
$password = cli_secret('Password: ');
$confirm = cli_secret('Confirm password: ');

if ($name === '' || mb_strlen($name) > 120) {
    fwrite(STDERR, "Enter a name of 120 characters or fewer.\n");
    exit(1);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
    fwrite(STDERR, "Enter a valid email address for the sign-in username.\n");
    exit(1);
}

if (!cli_password_is_strong($password, $email)) {
    fwrite(STDERR, "Use at least 12 characters, including a letter and a number, and do not reuse the username.\n");
    exit(1);
}

if (!hash_equals($password, $confirm)) {
    fwrite(STDERR, "The passwords did not match.\n");
    exit(1);
}

try {
    $admins = new Admin();
    if ($admins->findByEmail($email) !== null) {
        fwrite(STDERR, "An administrator with that username already exists.\n");
        exit(1);
    }

    $admins->create($name, $email, password_hash($password, PASSWORD_DEFAULT));
} catch (PDOException) {
    fwrite(STDERR, "The administrator could not be created. Import database/schema.sql and check config/config.php.\n");
    exit(1);
}

fwrite(STDOUT, "Administrator account created.\n");
exit(0);

function cli_ask(string $prompt): string
{
    fwrite(STDOUT, $prompt);
    $line = fgets(STDIN);
    if ($line === false) {
        fwrite(STDERR, "Input ended before the account was created.\n");
        exit(1);
    }

    return trim($line);
}

function cli_secret(string $prompt): string
{
    return cli_ask($prompt);
}

function cli_password_is_strong(string $password, string $username): bool
{
    if (mb_strlen($password) < 12 || mb_strlen($password) > 200) {
        return false;
    }

    if (hash_equals($password, $username)) {
        return false;
    }

    return preg_match('/[A-Za-z]/', $password) === 1 && preg_match('/\d/', $password) === 1;
}
