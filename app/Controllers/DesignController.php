<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\DesignItem;

class DesignController extends PublicController
{
    public function index(): void
    {
        $items = array_values(array_filter(
            array_map('present_design', (new DesignItem())->published()),
            static fn (array $item): bool => $item['image_url'] !== ''
        ));
        $categories = [];
        foreach ($items as $item) {
            if ($item['category'] !== '' && !in_array($item['category'], $categories, true)) {
                $categories[] = $item['category'];
            }
        }

        $siteName = $this->siteName();

        $this->page('public/design', [
            'title' => $this->titled('Graphic design', $siteName),
            'metaDescription' => 'Published graphic design work by ' . $siteName . '.',
            'canonicalPath' => '/design',
            'items' => $items,
            'categories' => $categories,
        ]);
    }
}
