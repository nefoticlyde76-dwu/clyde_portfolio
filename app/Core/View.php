<?php

declare(strict_types=1);

namespace App\Core;

class View
{
    public static function render(string $view, array $data = [], ?string $layout = 'layouts/public'): void
    {
        $viewFile = APP_PATH . '/Views/' . $view . '.php';
        if (!is_file($viewFile)) {
            throw new \RuntimeException('The requested view is not available.');
        }

        extract($data, EXTR_SKIP);
        ob_start();
        require $viewFile;
        $content = ob_get_clean();

        if ($layout === null) {
            echo $content;
            return;
        }

        $layoutFile = APP_PATH . '/Views/' . $layout . '.php';
        if (!is_file($layoutFile)) {
            throw new \RuntimeException('The requested layout is not available.');
        }

        require $layoutFile;
    }
}
