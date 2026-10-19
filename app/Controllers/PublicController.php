<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Controller;
use App\Models\Profile;

abstract class PublicController extends Controller
{
    private ?array $profileCache = null;

    protected function profile(): array
    {
        if ($this->profileCache === null) {
            $this->profileCache = present_profile((new Profile())->current());
        }

        return $this->profileCache;
    }

    protected function siteName(): string
    {
        $name = $this->profile()['full_name'];

        return $name !== '' ? $name : (string) app_config()['app_name'];
    }

    protected function page(string $view, array $data = []): void
    {
        $data['profile'] = $this->profile();
        $data['siteName'] = $this->siteName();
        $this->render($view, $data, 'layouts/public');
    }

    protected function titled(string $pageTitle, string $siteName): string
    {
        return $pageTitle . ' | ' . $siteName;
    }
}
