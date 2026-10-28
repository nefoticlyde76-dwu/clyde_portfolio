<?php

declare(strict_types=1);

/**
 * Loads application settings.
 * A local config/config.php overrides the example file.
 */

$localConfig = __DIR__ . '/config.php';
$configFile = is_file($localConfig) ? $localConfig : __DIR__ . '/config.example.php';
$config = require $configFile;

if (!is_array($config)) {
    throw new RuntimeException('Application configuration could not be loaded.');
}

$environmentOverrides = [
    'app_name' => 'APP_NAME',
    'base_url' => 'BASE_URL',
    'db_host' => 'DB_HOST',
    'db_port' => 'DB_PORT',
    'db_name' => 'DB_NAME',
    'db_user' => 'DB_USER',
    'db_pass' => 'DB_PASS',
    'db_ssl' => 'DB_SSL',
    'db_ssl_ca' => 'DB_SSL_CA',
    'session_driver' => 'SESSION_DRIVER',
    'blob_base_url' => 'BLOB_BASE_URL',
    'blob_upload_secret' => 'BLOB_UPLOAD_SECRET',
    'environment' => 'APP_ENV',
];

foreach ($environmentOverrides as $key => $environmentVariable) {
    $value = getenv($environmentVariable);
    if ($value !== false) {
        $config[$key] = $value;
    }
}

$config['db_port'] = (int) ($config['db_port'] ?? 3306);
$dbSsl = filter_var($config['db_ssl'] ?? false, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
if ($dbSsl === null) {
    throw new RuntimeException('Database TLS setting must be true or false.');
}
$config['db_ssl'] = $dbSsl;
$config['db_ssl_ca'] = trim((string) ($config['db_ssl_ca'] ?? ''));
$config['session_driver'] = (string) ($config['session_driver'] ?? 'files');
$config['blob_base_url'] = rtrim((string) ($config['blob_base_url'] ?? ''), '/');
$config['blob_upload_secret'] = (string) ($config['blob_upload_secret'] ?? '');

$required = ['app_name', 'base_url', 'db_host', 'db_name', 'db_user', 'db_pass', 'environment'];

foreach ($required as $key) {
    if (!array_key_exists($key, $config)) {
        throw new RuntimeException('Application configuration is incomplete.');
    }
}

$environment = (string) $config['environment'];
if (!in_array($environment, ['development', 'production'], true)) {
    throw new RuntimeException('Application environment is not recognised.');
}

if (!in_array($config['session_driver'], ['files', 'database'], true)) {
    throw new RuntimeException('Session storage driver is not recognised.');
}

if ($config['db_port'] < 1 || $config['db_port'] > 65535) {
    throw new RuntimeException('Database port is not valid.');
}

if (getenv('VERCEL') === '1') {
    $blobUrl = parse_url($config['blob_base_url']);
    $baseUrl = parse_url((string) $config['base_url']);
    if (
        $config['session_driver'] !== 'database'
        || $environment !== 'production'
        || !str_starts_with((string) $config['base_url'], 'https://')
        || !is_array($baseUrl)
        || !isset($baseUrl['host'])
        || !is_array($blobUrl)
        || ($blobUrl['scheme'] ?? '') !== 'https'
        || !isset($blobUrl['host'])
        || ($blobUrl['path'] ?? '') !== ''
        || array_intersect(['user', 'pass', 'query', 'fragment'], array_keys($blobUrl)) !== []
        || array_intersect(['user', 'pass', 'query', 'fragment'], array_keys($baseUrl)) !== []
        || strlen($config['blob_upload_secret']) < 32
    ) {
        throw new RuntimeException('Vercel production configuration is incomplete.');
    }
}

$config['app_name'] = (string) $config['app_name'];
$config['base_url'] = rtrim((string) $config['base_url'], '/');
$config['db_host'] = (string) $config['db_host'];
$config['db_name'] = (string) $config['db_name'];
$config['db_user'] = (string) $config['db_user'];
$config['db_pass'] = (string) $config['db_pass'];
$config['environment'] = $environment;

return $config;
