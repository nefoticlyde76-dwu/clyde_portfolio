<?php
/** @var array $profile */
/** @var string $siteName */
$brand = $profile['full_name'] !== '' ? $profile['full_name'] : $siteName;
$brandParts = preg_split('/\s+/', $brand, 2) ?: [$brand];
$workCurrent = nav_is_current('/projects') || nav_is_current('/design') || nav_is_current('/certificates');
$items = [
    [
        'href' => url('/projects'),
        'title' => 'Projects',
        'text' => 'Published software and systems work.',
        'current' => request_path() === '/projects',
        'icon' => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    ],
    [
        'href' => url('/design'),
        'title' => 'Graphic design',
        'text' => 'Logos, posters, banners, and brand work.',
        'current' => nav_is_current('/design'),
        'icon' => '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>',
    ],
    [
        'href' => url('/projects/wpu-enterprise-information-system'),
        'title' => 'WPU Enterprise Information System',
        'text' => 'IS403 group project. Dormitory subsystem.',
        'current' => nav_is_current('/projects/wpu-enterprise-information-system'),
        'icon' => '<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>',
    ],
    [
        'href' => url('/certificates'),
        'title' => 'Certificates',
        'text' => 'Credentials appear here after they are published.',
        'current' => nav_is_current('/certificates'),
        'icon' => '<circle cx="12" cy="8" r="5"/><path d="M8.5 12.5L7 22l5-3 5 3-1.5-9.5"/>',
    ],
    [
        'href' => url('/experience'),
        'title' => 'Experience',
        'text' => 'Placement, design work, leadership, and study.',
        'current' => nav_is_current('/experience'),
        'icon' => '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    ],
    [
        'href' => url('/about'),
        'title' => 'About',
        'text' => 'Background, education, and Madang.',
        'current' => nav_is_current('/about'),
        'icon' => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    ],
];
$mobile = [
    ['/projects', 'Projects'],
    ['/projects/telehealth-png', 'TeleHealth PNG'],
    ['/projects/wpu-enterprise-information-system', 'WPU Enterprise Information System'],
    ['/design', 'Graphic design'],
    ['/certificates', 'Certificates'],
    ['/experience', 'Experience'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
];
?>
<header class="site-header">
    <nav class="mega-nav" aria-label="Primary">
        <a class="mega-brand" href="<?= e(url('/')) ?>"><?php if (isset($brandParts[1])): ?><?= e($brandParts[0]) ?> <span><?= e($brandParts[1]) ?></span><?php else: ?><?= e($brand) ?><?php endif; ?></a>
        <ul class="mega-links">
            <li class="mega-item<?= $workCurrent ? ' is-current' : '' ?>">
                <button type="button" class="mega-trigger" aria-haspopup="true">
                    Work
                    <svg class="mega-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
                </button>
                <div class="mega-panel">
                    <div class="mega-grid">
                        <?php foreach (array_slice($items, 0, 2) as $item): ?>
                            <a class="mega-link" href="<?= e($item['href']) ?>"<?= $item['current'] ? ' aria-current="page"' : '' ?>>
                                <span class="mega-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><?= $item['icon'] ?></svg></span>
                                <span><span class="mega-link-title"><?= e($item['title']) ?></span><span class="mega-link-text"><?= e($item['text']) ?></span></span>
                            </a>
                        <?php endforeach; ?>
                        <a class="mega-feature" href="<?= e(url('/projects/telehealth-png')) ?>"<?= nav_is_current('/projects/telehealth-png') ? ' aria-current="page"' : '' ?>>
                            <span class="mega-kicker">Featured</span>
                            <span class="mega-feature-title">TeleHealth PNG</span>
                            <span class="mega-feature-text">Final-year capstone for the Milne Bay Provincial Health Authority.</span>
                            <span class="mega-feature-more">View the project</span>
                        </a>
                        <?php foreach (array_slice($items, 2) as $item): ?>
                            <a class="mega-link" href="<?= e($item['href']) ?>"<?= $item['current'] ? ' aria-current="page"' : '' ?>>
                                <span class="mega-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75"><?= $item['icon'] ?></svg></span>
                                <span><span class="mega-link-title"><?= e($item['title']) ?></span><span class="mega-link-text"><?= e($item['text']) ?></span></span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                    <div class="mega-foot">
                        <a href="<?= e(url('/projects/telehealth-png')) ?>">TeleHealth PNG</a>
                        <a href="<?= e(url('/projects/wpu-enterprise-information-system')) ?>">WPU Enterprise Information System</a>
                        <a class="mega-foot-all" href="<?= e(url('/projects')) ?>">All projects</a>
                    </div>
                </div>
            </li>
            <li><a class="mega-direct<?= nav_is_current('/about') ? ' is-current' : '' ?>" href="<?= e(url('/about')) ?>"<?= nav_is_current('/about') ? ' aria-current="page"' : '' ?>>About</a></li>
            <li><a class="mega-direct<?= nav_is_current('/experience') ? ' is-current' : '' ?>" href="<?= e(url('/experience')) ?>"<?= nav_is_current('/experience') ? ' aria-current="page"' : '' ?>>Experience</a></li>
        </ul>
        <div class="mega-actions">
            <a class="mega-quiet" href="<?= e(url('/contact')) ?>"<?= nav_is_current('/contact') ? ' aria-current="page"' : '' ?>>Contact</a>
            <a class="mega-cta" href="<?= e(url('/projects')) ?>">View projects</a>
            <details class="mega-mobile">
                <summary aria-label="Open menu">
                    <svg class="mega-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>
                    <svg class="mega-shut" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
                </summary>
                <ul>
                    <?php foreach ($mobile as [$path, $label]): ?>
                        <li><a href="<?= e(url($path)) ?>"<?= nav_is_current($path) ? ' aria-current="page"' : '' ?>><?= e($label) ?></a></li>
                    <?php endforeach; ?>
                </ul>
            </details>
        </div>
    </nav>
</header>
