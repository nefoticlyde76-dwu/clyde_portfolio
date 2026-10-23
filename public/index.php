<?php

declare(strict_types=1);

use App\Core\Router;

define('PUBLIC_PATH', __DIR__);
$bootstrapPath = __DIR__ . '/app/Core/bootstrap.php';
if (!is_file($bootstrapPath)) {
    $bootstrapPath = dirname(__DIR__) . '/app/Core/bootstrap.php';
}
require $bootstrapPath;

$router = new Router();
require APP_PATH . '/Core/routes.php';
$router->dispatch(request_method(), request_path());
