<?php
/** @var array $profile */
/** @var string $siteName */
/** @var array $projects */
/** @var int $publishedCount */
/** @var int $liveCount */
/** @var array $education */
/** @var array $skillNames */
/** @var array $steps */
/** @var string $statement */

$displayName = $profile['full_name'] !== '' ? $profile['full_name'] : $siteName;
$nameParts = preg_split('/\s+/', $displayName, 2) ?: [$displayName];
$callout = 'A live teleconsultation system for the Milne Bay Provincial Health Authority.';

$finalYear = '';
foreach ($education as $item) {
    if (preg_match('/\b(20\d{2})\b(?!.*\b20\d{2}\b)/', (string) ($item['period_label'] ?? ''), $yearMatch) === 1) {
        $finalYear = $yearMatch[1];
        break;
    }
}
$liveProject = null;
foreach ($projects as $project) {
    if (($project['live_url'] ?? '') !== '') {
        $liveProject = $project;
        break;
    }
}
$stats = [];
if ($publishedCount > 0) {
    $stats[] = [(string) $publishedCount, $publishedCount === 1 ? 'Published project' : 'Published projects'];
}
if ($liveCount > 0) {
    $stats[] = [(string) $liveCount, $liveCount === 1 ? 'Live system' : 'Live systems'];
}
if ($finalYear !== '') {
    $stats[] = [$finalYear, 'Final year'];
}

$person = [
    '@context' => 'https://schema.org',
    '@type' => 'Person',
    'name' => $displayName,
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
    $person['address'] = ['@type' => 'PostalAddress', 'addressLocality' => $profile['location']];
}

$icons = [
    'search' => '<circle cx="11" cy="11" r="6"/><path d="M16 16l5 5"/>',
    'map' => '<path d="M4 6l6-2 5 2 5-2v14l-5 2-5-2-6 2z"/><path d="M10 4v14M15 6v14"/>',
    'pen' => '<path d="M4 20l4.5-1L19 8.5 15.5 5 5 15.5z"/><path d="M13.5 7l3.5 3.5"/>',
    'code' => '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    'send' => '<path d="M4 12l16-7-6 16-2.5-6.5z"/>',
];
?>
<section class="reel" aria-label="Introduction">
    <div class="studio reel-stage">
        <p class="reel-word" aria-hidden="true">Portfolio</p>
        <div class="reel-intro">
            <p class="reel-hello">Hello, I'm</p>
            <h1 class="reel-name">
                <?php foreach ($nameParts as $part): ?>
                    <span><?= e($part) ?></span>
                <?php endforeach; ?>
            </h1>
            <?php if ($profile['headline'] !== ''): ?>
                <p class="reel-title"><span class="reel-mark" aria-hidden="true"></span><?= e($profile['headline']) ?></p>
            <?php endif; ?>
            <?php if ($profile['introduction'] !== ''): ?>
                <p class="reel-copy"><?= e($profile['introduction']) ?></p>
            <?php endif; ?>
            <?php if ($profile['location'] !== ''): ?>
                <p class="reel-pin">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg>
                    <?= e($profile['location']) ?>
                </p>
            <?php endif; ?>
            <div class="reel-actions">
                <a class="reel-action-primary" href="<?= e(url('/projects')) ?>">Explore projects <span aria-hidden="true">→</span></a>
                <a class="reel-action-secondary" href="<?= e(url('/contact')) ?>">Get in touch</a>
            </div>
        </div>
        <div class="reel-aside">
            <p class="reel-callout"><span aria-hidden="true">+</span> <?= e($callout) ?></p>
            <?php if ($stats !== []): ?>
                <ul class="reel-stats">
                    <?php foreach ($stats as [$value, $label]): ?>
                        <?php
                        $statIcon = 'folder';
                        if (stripos($label, 'live') !== false) {
                            $statIcon = 'signal';
                        } elseif (stripos($label, 'year') !== false) {
                            $statIcon = 'calendar';
                        }
                        $statSvg = [
                            'folder' => '<path d="M3 7h6l2 2h10v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
                            'signal' => '<path d="M5 18v-3M10 18V9M15 18V6M20 18V3"/>',
                            'calendar' => '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
                        ];
                        ?>
                        <li>
                            <span class="reel-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><?= $statSvg[$statIcon] ?></svg></span>
                            <span class="reel-figure"><?= e($value) ?></span>
                            <span><?= e($label) ?></span>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
    </div>
</section>

<section class="studio-block" aria-labelledby="selected-heading">
    <div class="studio">
        <div class="studio-head">
            <h2 id="selected-heading">Selected projects <span aria-hidden="true">+</span></h2>
            <a href="<?= e(url('/projects')) ?>">View all projects <span aria-hidden="true">→</span></a>
        </div>
        <?php if ($projects === []): ?>
            <p class="empty-state">No projects are published yet.</p>
        <?php else: ?>
            <div class="shot-grid<?= count($projects) === 2 ? ' is-pair' : '' ?>">
                <?php foreach ($projects as $index => $project): ?>
                    <a class="shot" href="<?= e(url('/projects/' . $project['slug'])) ?>">
                        <span class="shot-frame">
                            <?php if ($project['cover_url'] !== ''): ?>
                                <img src="<?= e($project['cover_url']) ?>" alt="<?= e($project['title'] . ' display image') ?>">
                            <?php else: ?>
                                <span class="shot-fallback">
                                    <span class="shot-mock" aria-hidden="true"><span></span><span></span><span></span></span>
                                    <span class="shot-pending">Display image not added</span>
                                </span>
                            <?php endif; ?>
                        </span>
                        <span class="shot-meta">
                            <span class="shot-no"><?= e(str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)) ?></span>
                            <span class="shot-copy">
                                <span class="shot-title"><?= e($project['title']) ?></span>
                                <?php if (($project['category'] ?? '') !== ''): ?>
                                    <span class="shot-kind"><?= e((string) $project['category']) ?></span>
                                <?php endif; ?>
                            </span>
                            <span class="shot-arrow" aria-hidden="true">→</span>
                        </span>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>

<section class="studio-block" aria-label="Education, process, and statement">
    <div class="studio dossier">
        <div class="dossier-edu">
            <h2>Education <span aria-hidden="true">&amp;</span> skills <span aria-hidden="true">+</span></h2>
            <?php if ($education === []): ?>
                <p class="empty-state">No education record is published yet.</p>
            <?php else: ?>
                <p class="dossier-kicker">Education</p>
                <?php foreach ($education as $item): ?>
                    <div class="edu-row">
                        <div>
                            <h3><?= e((string) $item['title']) ?></h3>
                            <?php if (trim((string) $item['organization']) !== ''): ?>
                                <p><?= e((string) $item['organization']) ?></p>
                            <?php endif; ?>
                        </div>
                        <?php if (trim((string) $item['period_label']) !== ''): ?>
                            <p class="edu-date"><?= e((string) $item['period_label']) ?></p>
                        <?php endif; ?>
                    </div>
                <?php endforeach; ?>
            <?php endif; ?>
            <p class="dossier-kicker">Skills</p>
            <?php if ($skillNames === []): ?>
                <p class="empty-state">No skills are published yet.</p>
            <?php else: ?>
                <ul class="skill-pills">
                    <?php foreach ($skillNames as $name): ?>
                        <li><?= e($name) ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
            <p class="dossier-more"><a href="<?= e(url('/experience')) ?>">Placement, design, and leadership</a></p>
        </div>
        <div class="dossier-process">
            <h2>Work process <span aria-hidden="true">+</span></h2>
            <ol class="process">
                <?php foreach ($steps as $step): ?>
                    <li>
                        <span class="process-no"><?= e($step['number']) ?></span>
                        <span class="process-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><?= $icons[$step['icon']] ?? '' ?></svg>
                        </span>
                        <div>
                            <h3><?= e($step['title']) ?></h3>
                            <p><?= e($step['text']) ?></p>
                        </div>
                    </li>
                <?php endforeach; ?>
            </ol>
        </div>
        <aside class="creed">
            <p class="visually-hidden">A design statement for this site, not a client testimonial.</p>
            <span class="creed-mark" aria-hidden="true">“</span>
            <blockquote>
                <p><?= e($statement) ?></p>
            </blockquote>
            <p class="creed-sign"><?= e($nameParts[0]) ?></p>
            <a class="creed-close" href="<?= e(url('/contact')) ?>">Let's work together.</a>
        </aside>
    </div>
</section>

<section class="studio-block invite-wrap" aria-labelledby="invite-heading">
    <div class="studio invite">
        <div>
            <h2 id="invite-heading">Let's work together <span aria-hidden="true">+</span></h2>
            <p>
                <?php if ($profile['location'] !== ''): ?>
                    Based in <?= e($profile['location']) ?>.
                <?php endif; ?>
                Messages sent through the form are saved on this site. They are not delivered by email.
            </p>
            <a class="invite-pill" href="<?= e(url('/contact')) ?>">Send a message <span aria-hidden="true">→</span></a>
        </div>
        <ul class="invite-list">
            <li>
                <span class="invite-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg></span>
                <span>
                    <span class="invite-label">Message</span>
                    <?php if ($profile['public_email'] !== ''): ?>
                        <a href="mailto:<?= e($profile['public_email']) ?>"><?= e($profile['public_email']) ?></a>
                    <?php else: ?>
                        <a href="<?= e(url('/contact')) ?>">Contact form</a>
                        <span class="invite-note">No public email is published yet.</span>
                    <?php endif; ?>
                </span>
            </li>
            <?php if ($liveProject !== null): ?>
                <li>
                    <span class="invite-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.8 2.5 15.2 0 18M12 3c-2.5 2.8-2.5 15.2 0 18"/></svg></span>
                    <span>
                        <span class="invite-label"><?= e((string) $liveProject['title']) ?></span>
                        <a href="<?= e((string) $liveProject['live_url']) ?>" rel="noopener noreferrer"><?= e((string) preg_replace('#^https?://#', '', (string) $liveProject['live_url'])) ?></a>
                    </span>
                </li>
            <?php endif; ?>
            <?php if ($profile['phone'] !== ''): ?>
                <li>
                    <span class="invite-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h4l2 5-3 2a12 12 0 006 6l2-3 5 2v4a2 2 0 01-2 2A16 16 0 014 5a2 2 0 012-2z"/></svg></span>
                    <span>
                        <span class="invite-label">Phone</span>
                        <a href="tel:<?= e(preg_replace('/[^\d+]/', '', $profile['phone']) ?? '') ?>"><?= e($profile['phone']) ?></a>
                    </span>
                </li>
            <?php endif; ?>
            <?php if ($profile['location'] !== ''): ?>
                <li>
                    <span class="invite-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/></svg></span>
                    <span>
                        <span class="invite-label">Location</span>
                        <span class="invite-value"><?= e($profile['location']) ?></span>
                    </span>
                </li>
            <?php endif; ?>
        </ul>
        <div class="desk" aria-hidden="true">
            <div class="desk-laptop">
                <div class="desk-lid">
                    <span class="desk-cam"></span>
                    <div class="desk-screen">
                        <p>Portfolio</p>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <div class="desk-base"></div>
            </div>
        </div>
    </div>
</section>
<script type="application/ld+json"><?= json_encode($person, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?></script>
