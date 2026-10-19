<?php
/** @var array $projects */
/** @var array $certificates */
$pages = ['/', '/about', '/projects', '/design', '/certificates', '/experience', '/contact'];
echo '<?xml version="1.0" encoding="UTF-8"?>';
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<?php foreach ($pages as $path): ?>
    <url><loc><?= e(url($path)) ?></loc></url>
<?php endforeach; ?>
<?php foreach ($projects as $project): ?>
    <url>
        <loc><?= e(url('/projects/' . $project['slug'])) ?></loc>
        <?php $updated = format_date((string) ($project['updated_at'] ?? ''), 'Y-m-d'); ?>
        <?php if ($updated !== ''): ?>
            <lastmod><?= e($updated) ?></lastmod>
        <?php endif; ?>
    </url>
<?php endforeach; ?>
<?php foreach ($certificates as $certificate): ?>
    <url>
        <loc><?= e(url('/certificates/' . $certificate['id'])) ?></loc>
        <?php $updated = format_date((string) ($certificate['updated_at'] ?? ''), 'Y-m-d'); ?>
        <?php if ($updated !== ''): ?>
            <lastmod><?= e($updated) ?></lastmod>
        <?php endif; ?>
    </url>
<?php endforeach; ?>
</urlset>
