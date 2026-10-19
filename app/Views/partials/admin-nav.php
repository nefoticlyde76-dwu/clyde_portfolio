<?php
/** @var string $content */
/** @var string $title */
$links = [
    ['/admin', 'Overview'],
    ['/admin/projects', 'Projects'],
    ['/admin/certificates', 'Certificates'],
    ['/admin/designs', 'Graphic designs'],
    ['/admin/skills', 'Skills'],
    ['/admin/experience', 'Experience'],
    ['/admin/profile', 'Profile and social links'],
    ['/admin/media', 'Resume and profile image'],
    ['/admin/messages', 'Contact messages'],
];
?>
<nav class="admin-nav" aria-label="Administration">
    <ul>
        <?php foreach ($links as [$path, $label]): ?>
            <?php $current = admin_nav_current($path); ?>
            <li>
                <a href="<?= e(url($path)) ?>"<?= $current ? ' aria-current="page"' : '' ?>><?= e($label) ?></a>
            </li>
        <?php endforeach; ?>
        <li><a href="<?= e(url('/')) ?>" rel="noopener noreferrer">View public website</a></li>
    </ul>
    <form method="post" action="<?= e(url('/admin/logout')) ?>">
        <?= csrf_field() ?>
        <button type="submit">Logout</button>
    </form>
</nav>
