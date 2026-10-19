<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Certificate;
use App\Models\Project;

class SeoController extends PublicController
{
    public function sitemap(): void
    {
        $projects = (new Project())->published();
        $certificates = (new Certificate())->published();
        header('Content-Type: application/xml; charset=UTF-8');
        $this->render('public/sitemap', [
            'projects' => $projects,
            'certificates' => $certificates,
        ], null);
    }

    public function robots(): void
    {
        header('Content-Type: text/plain; charset=UTF-8');
        $this->render('public/robots', [], null);
    }
}
