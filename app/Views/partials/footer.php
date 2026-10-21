<?php
/** @var array $profile */
/** @var string $siteName */
$brand = $profile['full_name'] !== '' ? $profile['full_name'] : $siteName;
$brandParts = preg_split('/\s+/', $brand, 2) ?: [$brand];
$links = [
    ['/projects', 'Projects'],
    ['/design', 'Design'],
    ['/certificates', 'Certificates'],
    ['/experience', 'Experience'],
    ['/about', 'About'],
    ['/contact', 'Contact'],
];
?>
<footer class="site-footer">
    <div class="container site-container footer-grid">
        <div>
            <p class="footer-name"><?php if (isset($brandParts[1])): ?><?= e($brandParts[0]) ?> <span><?= e($brandParts[1]) ?></span><?php else: ?><?= e($brand) ?><?php endif; ?></p>
            <?php if ($profile['location'] !== ''): ?>
                <p><?= e($profile['location']) ?></p>
            <?php endif; ?>
        </div>
        <nav aria-label="Footer">
            <ul class="footer-links">
                <?php foreach ($links as [$path, $label]): ?>
                    <li><a href="<?= e(url($path)) ?>"><?= e($label) ?></a></li>
                <?php endforeach; ?>
            </ul>
        </nav>
        <div class="footer-contact">
            <?php if ($profile['public_email'] !== ''): ?>
                <a href="mailto:<?= e($profile['public_email']) ?>"><?= e($profile['public_email']) ?></a>
            <?php endif; ?>
            <?php if ($profile['linkedin_url'] !== ''): ?>
                <a href="<?= e($profile['linkedin_url']) ?>" rel="noopener noreferrer">LinkedIn</a>
            <?php endif; ?>
            <?php if ($profile['github_url'] !== ''): ?>
                <a href="<?= e($profile['github_url']) ?>" rel="noopener noreferrer">GitHub</a>
            <?php endif; ?>
            <a href="<?= e(url('/contact')) ?>">Send a message</a>
        </div>
    </div>
</footer>
