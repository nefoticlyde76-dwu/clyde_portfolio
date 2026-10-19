<?php
/** @var array $certificate */
/** @var string $fileUrl */
/** @var string $imageUrl */
$credential = safe_url($certificate['credential_url'] ?? null);
?>
<header class="admin-heading admin-heading-row">
    <div>
        <h1><?= e((string) $certificate['title']) ?></h1>
        <p class="lede"><?php status_badge((string) $certificate['status']); ?></p>
    </div>
    <?php record_actions('/admin/certificates', (int) $certificate['id'], (string) $certificate['status']); ?>
</header>
<dl class="fact-list">
    <div><dt>Issuer</dt><dd><?= e((string) $certificate['issuing_organization']) ?></dd></div>
    <div><dt>Issue date</dt><dd><?= e(format_date((string) ($certificate['issued_on'] ?? '')) ?: 'Not set') ?></dd></div>
    <div><dt>Credential ID</dt><dd><?= trim((string) ($certificate['credential_id'] ?? '')) !== '' ? e((string) $certificate['credential_id']) : 'Not set' ?></dd></div>
    <div><dt>Credential URL</dt><dd><?php if ($credential): ?><a href="<?= e($credential) ?>" rel="noopener noreferrer"><?= e($credential) ?></a><?php else: ?>Not set<?php endif; ?></dd></div>
    <div><dt>Description</dt><dd class="preserve"><?= trim((string) ($certificate['description'] ?? '')) !== '' ? e((string) $certificate['description']) : 'Not set' ?></dd></div>
    <div><dt>Display order</dt><dd><?= e((string) $certificate['display_order']) ?></dd></div>
    <div><dt>Display image</dt><dd><?= $imageUrl !== '' ? 'Uploaded' : 'Not uploaded' ?></dd></div>
    <div><dt>File</dt><dd><?php if ($fileUrl !== ''): ?><a href="<?= e($fileUrl) ?>" rel="noopener noreferrer">Open file</a><?php else: ?>Not uploaded<?php endif; ?></dd></div>
</dl>
<?php if ($imageUrl !== ''): ?>
    <figure class="admin-preview"><img src="<?= e($imageUrl) ?>" alt=""></figure>
<?php endif; ?>
<?php if ($fileUrl !== '' && preg_match('/\.(jpe?g|png|gif|webp)$/i', (string) parse_url($fileUrl, PHP_URL_PATH))): ?>
    <figure class="admin-preview"><img src="<?= e($fileUrl) ?>" alt=""></figure>
<?php endif; ?>
