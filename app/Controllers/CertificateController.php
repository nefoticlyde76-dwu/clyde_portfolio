<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\Certificate;

class CertificateController extends PublicController
{
    public function index(): void
    {
        $certificates = array_map('present_certificate', (new Certificate())->published());
        $siteName = $this->siteName();

        $this->page('public/certificates', [
            'title' => $this->titled('Certificates', $siteName),
            'metaDescription' => 'Published certificates and credentials for ' . $siteName . '.',
            'canonicalPath' => '/certificates',
            'certificates' => $certificates,
        ]);
    }

    public function show(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);
        $certificate = (new Certificate())->findPublished($id);
        if ($certificate === null) {
            (new NotFoundController())->missing();
            return;
        }

        $certificate = present_certificate($certificate);
        $siteName = $this->siteName();
        $description = $certificate['description'] !== ''
            ? excerpt($certificate['description'], 160)
            : $certificate['title'] . ($certificate['issuing_organization'] !== '' ? ', ' . $certificate['issuing_organization'] : '');

        $this->page('public/certificates/show', [
            'title' => $certificate['title'] . ' | ' . $siteName,
            'metaDescription' => $description,
            'canonicalPath' => '/certificates/' . $certificate['id'],
            'ogImage' => $certificate['display_url'],
            'certificate' => $certificate,
        ]);
    }
}
