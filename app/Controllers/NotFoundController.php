<?php

declare(strict_types=1);

namespace App\Controllers;

class NotFoundController extends PublicController
{
    public function missing(): void
    {
        http_response_code(404);
        $siteName = $this->siteName();

        $this->page('public/not-found', [
            'title' => $this->titled('Page not found', $siteName),
            'metaDescription' => 'That page is not available.',
            'robots' => 'noindex, follow',
            'includeCanonical' => false,
            'heading' => 'Page not found',
            'message' => 'That page is not available. The link may be out of date, or the project may still be unpublished.',
        ]);
    }

    public function unavailable(): void
    {
        http_response_code(405);
        $siteName = $this->siteName();

        $this->page('public/not-found', [
            'title' => $this->titled('Method not allowed', $siteName),
            'metaDescription' => 'That action is not available.',
            'robots' => 'noindex, follow',
            'includeCanonical' => false,
            'heading' => 'Method not allowed',
            'message' => 'That action is not available.',
        ]);
    }
}
