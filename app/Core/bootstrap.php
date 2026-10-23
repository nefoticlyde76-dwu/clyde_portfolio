<?php

declare(strict_types=1);

/**
 * Application bootstrap.
 * Starts configuration, class loading, sessions, and safe error handling.
 */

define('ROOT_PATH', dirname(__DIR__, 2));
define('APP_PATH', ROOT_PATH . '/app');
define('STORAGE_PATH', ROOT_PATH . '/storage');
if (!defined('PUBLIC_PATH')) {
    define('PUBLIC_PATH', ROOT_PATH . '/public');
}

ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', STORAGE_PATH . '/logs/php.log');

require APP_PATH . '/Core/helpers.php';

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';
    if (!str_starts_with($class, $prefix)) {
        return;
    }

    $relative = substr($class, strlen($prefix));
    $file = APP_PATH . '/' . str_replace('\\', '/', $relative) . '.php';
    if (is_file($file)) {
        require $file;
    }
});

$config = app_config();

date_default_timezone_set('Pacific/Port_Moresby');
mb_internal_encoding('UTF-8');

$cookiePath = parse_url($config['base_url'], PHP_URL_PATH);
if (!is_string($cookiePath) || $cookiePath === '' || $cookiePath === '/') {
    $cookiePath = '/';
} else {
    $cookiePath = rtrim($cookiePath, '/') . '/';
}

$secureCookie = str_starts_with($config['base_url'], 'https://');

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', $secureCookie ? '1' : '0');
ini_set('session.cookie_samesite', 'Lax');

session_name('clyde_portfolio');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => $cookiePath,
    'httponly' => true,
    'samesite' => 'Lax',
    'secure' => $secureCookie,
]);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

if (PHP_SAPI !== 'cli' && !headers_sent()) {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
}

set_exception_handler(static function (Throwable $exception): void {
    app_log($exception->getMessage() . ' in ' . $exception->getFile() . ':' . $exception->getLine());

    if (PHP_SAPI === 'cli') {
        fwrite(STDERR, "The command could not be completed.\n");
        exit(1);
    }

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/html; charset=UTF-8');
    }

    echo 'The application could not complete this request.';
});

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }

    throw new ErrorException($message, 0, $severity, $file, $line);
});
