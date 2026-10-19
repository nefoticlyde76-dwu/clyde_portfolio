<?php

declare(strict_types=1);

use App\Core\Router;

require dirname(__DIR__) . '/app/Core/bootstrap.php';

$router = new Router();
require dirname(__DIR__) . '/app/Core/routes.php';
$router->dispatch(request_method(), request_path());
