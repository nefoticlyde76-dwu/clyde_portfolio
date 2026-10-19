<?php

declare(strict_types=1);

namespace App\Core;

class Controller
{
    protected function render(string $view, array $data = [], ?string $layout = 'layouts/public'): void
    {
        View::render($view, $data, $layout);
    }
}
