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

$config['app_name'] = (string) $config['app_name'];
$config['base_url'] = rtrim((string) $config['base_url'], '/');
$config['db_host'] = (string) $config['db_host'];
$config['db_name'] = (string) $config['db_name'];
$config['db_user'] = (string) $config['db_user'];
$config['db_pass'] = (string) $config['db_pass'];
$config['environment'] = $environment;

return $config;
