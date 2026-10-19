<?php
/** @var array $project */
/** @var string $coverUrl */
$live = safe_url($project['live_url'] ?? null);
$repository = safe_url($project['repository_url'] ?? null);
$text = static function (?string $value): string {
    return trim((string) $value);
};
?>
<header class="admin-heading admin-heading-row">
    <div>
        <p class="eyebrow"><?= e((string) $project['category']) ?></p>
        <h1><?= e((string) $project['title']) ?></h1>
        <p class="lede"><?php status_badge((string) $project['status']); ?> <span class="meta-inline">/projects/<?= e((string) $project['slug']) ?></span></p>
    </div>
    <?php record_actions('/admin/projects', (int) $project['id'], (string) $project['status']); ?>
</header>
<dl class="fact-list">
    <div><dt>Short description</dt><dd class="preserve"><?= e($text($project['summary'] ?? '')) ?></dd></div>
    <?php if ($text($project['overview'] ?? '') !== ''): ?><div><dt>Overview</dt><dd class="preserve"><?= e($text($project['overview'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['purpose'] ?? '') !== ''): ?><div><dt>Problem or purpose</dt><dd class="preserve"><?= e($text($project['purpose'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['role'] ?? '') !== ''): ?><div><dt>Role</dt><dd><?= e($text($project['role'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['contribution'] ?? '') !== ''): ?><div><dt>Contribution</dt><dd class="preserve"><?= e($text($project['contribution'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['solution'] ?? '') !== ''): ?><div><dt>Solution</dt><dd class="preserve"><?= e($text($project['solution'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['technologies'] ?? '') !== ''): ?><div><dt>Technologies</dt><dd><?= e($text($project['technologies'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['features'] ?? '') !== ''): ?><div><dt>Features</dt><dd class="preserve"><?= e($text($project['features'])) ?></dd></div><?php endif; ?>
    <?php if ($text($project['lessons'] ?? '') !== ''): ?><div><dt>Challenges and lessons</dt><dd class="preserve"><?= e($text($project['lessons'])) ?></dd></div><?php endif; ?>
    <div><dt>Featured</dt><dd><?= (int) $project['is_featured'] === 1 ? 'Yes' : 'No' ?></dd></div>
    <div><dt>Display order</dt><dd><?= e((string) $project['display_order']) ?></dd></div>
    <div><dt>Live URL</dt><dd><?php if ($live): ?><a href="<?= e($live) ?>" rel="noopener noreferrer"><?= e($live) ?></a><?php else: ?>Not set<?php endif; ?></dd></div>
    <div><dt>Repository URL</dt><dd><?php if ($repository): ?><a href="<?= e($repository) ?>" rel="noopener noreferrer"><?= e($repository) ?></a><?php else: ?>Not set<?php endif; ?></dd></div>
</dl>
<?php if ($coverUrl !== ''): ?>
    <figure class="admin-preview">
        <img src="<?= e($coverUrl) ?>" alt="">
    </figure>
<?php endif; ?>
