<?php
/** @var array $profile */
/** @var string $siteName */
/** @var array $projects */
/** @var array $skillGroups */
/** @var array $designs */

$person = [
    '@context' => 'https://schema.org',
    '@type' => 'Person',
    'name' => $profile['full_name'] !== '' ? $profile['full_name'] : $siteName,
    'url' => url('/'),
];
if ($profile['headline'] !== '') {
    $person['jobTitle'] = $profile['headline'];
}
if ($profile['introduction'] !== '') {
    $person['description'] = $profile['introduction'];
}
if ($profile['public_email'] !== '') {
    $person['email'] = $profile['public_email'];
}
if ($profile['location'] !== '') {
    $person['address'] = [
        '@type' => 'PostalAddress',
        'addressLocality' => $profile['location'],
    ];
}
$sameAs = array_values(array_filter([$profile['linkedin_url'], $profile['github_url']]));
if ($sameAs !== []) {
    $person['sameAs'] = $sameAs;
}
?>
<?php
$displayName = $profile['full_name'] !== '' ? $profile['full_name'] : $siteName;
$nameParts = preg_split('/\s+/', $displayName, 2) ?: [$displayName];
$badges = [];
if ($profile['location'] !== '') {
    $badges[] = ['Based', $profile['location']];
}
foreach ($projects as $project) {
    if (($project['live_url'] ?? '') !== '') {
        $badges[] = ['Live', (string) $project['title']];
        break;
    }
}
$badges = array_slice($badges, 0, 3);
?>
<section class="product-hero" aria-label="Introduction">
    <div class="product-stage">
        <div class="product-laptop" aria-hidden="true">
            <div class="product-lid">
                <span class="product-camera"></span>
                <div class="product-screen">
                    <div class="product-screen-side" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
                    <div class="product-screen-main">
                        <div class="product-screen-bar"></div>
                        <div class="product-screen-row">
                            <div class="product-screen-panel"></div>
                            <div class="product-screen-panel"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="product-hinge"></div>
            <div class="product-base"></div>
            <div class="product-reflection"></div>
        </div>
        <?php if ($badges !== []): ?>
            <ul class="product-badges">
                <?php foreach ($badges as $badge): ?>
                    <li class="product-badge">
                        <?php if ($badge[0] === 'Based'): ?>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>
                        <?php else: ?>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M5 12.5a7 7 0 0114 0"/><path d="M8.2 12.5a3.8 3.8 0 017.6 0"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>
                        <?php endif; ?>
                        <span><strong><?= e($badge[0]) ?></strong><?= e($badge[1]) ?></span>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </div>
    <div class="product-copy">
        <?php if ($profile['headline'] !== ''): ?>
            <p class="product-kicker"><span class="product-rule" aria-hidden="true"></span><?= e($profile['headline']) ?></p>
        <?php endif; ?>
        <h1>
            <?php if (isset($nameParts[1])): ?>
                <?= e($nameParts[0]) ?> <em><?= e($nameParts[1]) ?></em>
            <?php else: ?>
                <?= e($displayName) ?>
            <?php endif; ?>
        </h1>
        <?php if ($profile['introduction'] !== ''): ?>
            <p class="product-lede"><?= e($profile['introduction']) ?></p>
        <?php endif; ?>
        <div class="product-actions">
            <a class="product-buy" href="<?= e(url('/projects')) ?>">View projects <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
            <a class="product-compare" href="<?= e(url('/contact')) ?>">Contact <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg></a>
            <?php if ($profile['resume_url'] !== ''): ?>
                <a class="product-compare" href="<?= e($profile['resume_url']) ?>">Download resume</a>
            <?php endif; ?>
        </div>
        <?php if ($profile['linkedin_url'] !== '' || $profile['github_url'] !== ''): ?>
            <p class="product-links">
                <?php if ($profile['linkedin_url'] !== ''): ?>
                    <a href="<?= e($profile['linkedin_url']) ?>" rel="noopener noreferrer">LinkedIn</a>
                <?php endif; ?>
                <?php if ($profile['github_url'] !== ''): ?>
                    <a href="<?= e($profile['github_url']) ?>" rel="noopener noreferrer">GitHub</a>
                <?php endif; ?>
            </p>
        <?php endif; ?>
    </div>
</section>

<section class="band">
    <div class="container site-container">
        <div class="section-head">
            <h2>Selected projects</h2>
            <a href="<?= e(url('/projects')) ?>">All projects</a>
        </div>
        <?php if ($projects === []): ?>
            <p class="empty-state">No projects are published yet.</p>
        <?php else: ?>
            <div class="card-grid">
                <?php foreach ($projects as $project): ?>
                    <?php require APP_PATH . '/Views/partials/project-card.php'; ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>

<section class="band">
    <div class="container site-container split">
        <div>
            <h2>Profile</h2>
            <?php if ($profile['profile_image_url'] !== ''): ?>
                <img class="portrait" src="<?= e($profile['profile_image_url']) ?>" alt="<?= e('Portrait of ' . ($profile['full_name'] !== '' ? $profile['full_name'] : $siteName)) ?>">
            <?php endif; ?>
            <?php if ($profile['biography'] !== ''): ?>
                <p><?= e($profile['biography']) ?></p>
            <?php elseif ($profile['introduction'] === ''): ?>
                <p class="empty-state">A longer biography has not been published yet.</p>
            <?php endif; ?>
            <?php if ($profile['location'] !== ''): ?>
                <p class="meta-line"><?= e($profile['location']) ?></p>
            <?php endif; ?>
            <p><a href="<?= e(url('/about')) ?>">Read the background</a></p>
        </div>
        <div>
            <h2>Technical skills</h2>
            <?php if ($skillGroups === []): ?>
                <p class="empty-state">No skills are published yet.</p>
            <?php else: ?>
                <div class="skill-stack">
                    <?php foreach ($skillGroups as $category => $skills): ?>
                        <div>
                            <h3><?= e((string) $category) ?></h3>
                            <p><?= e(implode(' · ', array_map(static fn (array $skill): string => (string) $skill['name'], $skills))) ?></p>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</section>

<section class="band">
    <div class="container site-container">
        <div class="section-head">
            <h2>Graphic design</h2>
            <a href="<?= e(url('/design')) ?>">Design portfolio</a>
        </div>
        <?php if ($designs === []): ?>
            <p class="empty-state">No graphic design pieces are published yet. This section stays empty until real work is uploaded.</p>
        <?php else: ?>
            <div class="design-grid">
                <?php foreach ($designs as $item): ?>
                    <a class="design-tile" href="<?= e(url('/design')) ?>">
                        <img src="<?= e($item['image_url']) ?>" alt="<?= e($item['alt']) ?>">
                        <span><?= e($item['title']) ?></span>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>

<section class="band closing">
    <div class="container site-container">
        <h2>Contact</h2>
        <p class="lede">
            <?php if ($profile['location'] !== ''): ?>
                Based in <?= e($profile['location']) ?>.
            <?php endif; ?>
            Messages sent through the form are saved on this site. They are not delivered by email.
        </p>
        <div class="hero-actions">
            <a class="btn btn-slate" href="<?= e(url('/contact')) ?>">Send a message</a>
            <?php if ($profile['public_email'] !== ''): ?>
                <a class="btn btn-line" href="mailto:<?= e($profile['public_email']) ?>"><?= e($profile['public_email']) ?></a>
            <?php endif; ?>
        </div>
    </div>
</section>
<script type="application/ld+json"><?= json_encode($person, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
