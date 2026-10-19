<?php
/** @var array $design */
/** @var string $imageUrl */
$external = safe_url($design['external_url'] ?? null);
?>
<header class="admin-heading admin-heading-row">
    <div>
        <p class="eyebrow"><?= e((string) $design['category']) ?></p>
        <h1><?= e((string) $design['title']) ?></h1>
        <p class="lede"><?php status_badge((string) $design['status']); ?></p>
    </div>
    <?php record_actions('/admin/designs', (int) $design['id'], (string) $design['status']); ?>
</header>
<dl class="fact-list">
    <div><dt>Description</dt><dd class="preserve"><?= trim((string) ($design['description'] ?? '')) !== '' ? e((string) $design['description']) : 'Not set' ?></dd></div>
    <div><dt>External link</dt><dd><?php if ($external): ?><a href="<?= e($external) ?>" rel="noopener noreferrer"><?= e($external) ?></a><?php else: ?>Not set<?php endif; ?></dd></div>
    <div><dt>Featured</dt><dd><?= (int) $design['is_featured'] === 1 ? 'Yes' : 'No' ?></dd></div>
    <div><dt>Display order</dt><dd><?= e((string) $design['display_order']) ?></dd></div>
</dl>
<?php if ($imageUrl !== ''): ?>
    <figure class="admin-preview"><img src="<?= e($imageUrl) ?>" alt=""></figure>
<?php else: ?>
    <p class="empty-state">No image has been added for this piece.</p>
<?php endif; ?>
