<?php

declare(strict_types=1);

namespace App\Core;

class Router
{
    /** @var array<int, array{method: string, path: string, pattern: ?string, handler: array{0: class-string, 1: string}}> */
    private array $routes = [];

    /**
     * @param array{0: class-string, 1: string} $handler
     */
    public function get(string $path, array $handler): void
    {
        $this->add('GET', $path, $handler);
    }

    /**
     * @param array{0: class-string, 1: string} $handler
     */
    public function post(string $path, array $handler): void
    {
        $this->add('POST', $path, $handler);
    }

    /**
     * @param array{0: class-string, 1: string} $handler
     */
    private function add(string $method, string $path, array $handler): void
    {
        $path = $path === '/' ? '/' : '/' . trim($path, '/');
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'pattern' => $this->pattern($path),
            'handler' => $handler,
        ];
    }

    private function pattern(string $path): ?string
    {
        if (!str_contains($path, '{')) {
            return null;
        }

        $regex = preg_replace(
            '#\{([a-zA-Z_][a-zA-Z0-9_]*)\}#',
            '(?P<$1>[a-z0-9]+(?:-[a-z0-9]+)*)',
            $path
        );

        return '#^' . $regex . '$#';
    }

    public function dispatch(string $method, string $path): void
    {
        $path = $path === '/' ? '/' : '/' . trim($path, '/');
        $allowed = [];

        foreach ($this->routes as $route) {
            $params = $this->match($route, $path);
            if ($params === null) {
                continue;
            }

            $allowed[] = $route['method'];
            $matchesMethod = $route['method'] === $method || ($method === 'HEAD' && $route['method'] === 'GET');
            if (!$matchesMethod) {
                continue;
            }

            $this->invoke($route['handler'], $params);
            return;
        }

        if ($allowed !== []) {
            http_response_code(405);
            header('Allow: ' . implode(', ', array_unique($allowed)));
            (new \App\Controllers\NotFoundController())->unavailable();
            return;
        }

        (new \App\Controllers\NotFoundController())->missing();
    }

    /**
     * @param array{method: string, path: string, pattern: ?string, handler: array{0: class-string, 1: string}} $route
     * @return array<string, string>|null
     */
    private function match(array $route, string $path): ?array
    {
        if ($route['pattern'] === null) {
            return $route['path'] === $path ? [] : null;
        }

        if (!preg_match($route['pattern'], $path, $matches)) {
            return null;
        }

        $params = [];
        foreach ($matches as $key => $value) {
            if (is_string($key)) {
                $params[$key] = (string) $value;
            }
        }

        return $params;
    }

    /**
     * @param array{0: class-string, 1: string} $handler
     * @param array<string, string> $params
     */
    private function invoke(array $handler, array $params): void
    {
        [$class, $action] = $handler;
        $controller = new $class();
        if ($params === []) {
            $controller->$action();
            return;
        }

        $controller->$action($params);
    }
}
