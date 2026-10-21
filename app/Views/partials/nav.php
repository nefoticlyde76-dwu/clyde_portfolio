<?php
/** @var array $profile */
/** @var string $siteName */
$brand = $profile['full_name'] !== '' ? $profile['full_name'] : $siteName;
$role = $profile['headline'] !== '' ? $profile['headline'] : $brand;
$roleLines = preg_split('/\s+and\s+/i', $role, 2) ?: [$role];
$links = [
    ['/projects', 'Projects'],
    ['/design', 'Design'],
    ['/certificates', 'Certificates'],
    ['/experience', 'Experience'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
];
?>
<header class="site-header">
    <div class="mast">
        <a class="mast-brand" href="<?= e(url('/')) ?>">
            <span class="mast-long">
                <?php foreach ($roleLines as $line): ?>
                    <span><?= e($line) ?></span>
                <?php endforeach; ?>
            </span>
            <span class="mast-short"><?= e($brand) ?></span>
        </a>
        <nav class="mast-nav" aria-label="Primary">
            <ul>
                <?php foreach ($links as [$path, $label]): ?>
                    <li><a href="<?= e(url($path)) ?>"<?= nav_is_current($path) ? ' aria-current="page"' : '' ?>><?= e($label) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </nav>
        <?php if ($profile['location'] !== ''): ?>
            <p class="mast-status"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg> <?= e($profile['location']) ?> <span aria-hidden="true">+</span></p>
        <?php else: ?>
            <p class="mast-status"><a href="<?= e(url('/contact')) ?>">Contact</a> <span aria-hidden="true">+</span></p>
        <?php endif; ?>
        <details class="mast-menu">
            <summary aria-label="Open menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
            </summary>
            <ul>
                <?php foreach ($links as [$path, $label]): ?>
                    <li><a href="<?= e(url($path)) ?>"<?= nav_is_current($path) ? ' aria-current="page"' : '' ?>><?= e($label) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </details>
    </div>
</header>
