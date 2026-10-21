<?php
/** @var array $skillGroups */
/** @var array $experiences */
$icons = [
    'code' => '<path d="M8 8l-4 4 4 4M16 8l4 4-4 4"/>',
    'layers' => '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    'data' => '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
    'tool' => '<path d="M14 7a4 4 0 01-5 5L4 17l3 3 5-5a4 4 0 005-5l-3 2-2-2z"/>',
    'people' => '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.2"/><path d="M3.5 19a5.5 5.5 0 0111 0M14 19a4 4 0 016.5-3"/>',
];
?>
<section class="page-hero">
    <div class="container site-container page-split">
        <div>
            <p class="eyebrow">Record</p>
            <h1>Skills and <span class="accent">experience</span></h1>
            <p class="lede">Published skills, education, placements, and independent work.</p>
        </div>
        <p class="page-note">Web and systems development <span aria-hidden="true">///</span></p>
    </div>
</section>
<section class="band">
    <div class="container site-container">
        <h2 class="block-title"><span class="reel-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 7a4 4 0 01-5 5L4 17l3 3 5-5a4 4 0 005-5l-3 2-2-2z"/></svg></span> Skills</h2>
        <?php if ($skillGroups === []): ?>
            <p class="empty-state">No skills are published yet.</p>
        <?php else: ?>
            <div class="skill-board">
                <?php foreach ($skillGroups as $category => $skills): ?>
                    <?php
                    $key = 'people';
                    $name = strtolower((string) $category);
                    if (str_contains($name, 'program') || str_contains($name, 'language')) {
                        $key = 'code';
                    } elseif (str_contains($name, 'framework') || str_contains($name, 'librar')) {
                        $key = 'layers';
                    } elseif (str_contains($name, 'data')) {
                        $key = 'data';
                    } elseif (str_contains($name, 'tool') || str_contains($name, 'platform')) {
                        $key = 'tool';
                    }
                    ?>
                    <section class="skill-card">
                        <h3><span aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><?= $icons[$key] ?></svg></span> <?= e((string) $category) ?></h3>
                        <ul>
                            <?php foreach ($skills as $skill): ?>
                                <li><?= e((string) $skill['name']) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </section>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>
<section class="band">
    <div class="container site-container">
        <h2 class="block-title"><span class="reel-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></span> Experience</h2>
        <?php if ($experiences === []): ?>
            <p class="empty-state">No experience records are published yet.</p>
        <?php else: ?>
            <ol class="timeline">
                <?php foreach ($experiences as $experience): ?>
                    <li>
                        <article>
                            <header>
                                <h3><?= e((string) $experience['title']) ?></h3>
                                <?php if (trim((string) $experience['period_label']) !== ''): ?>
                                    <p><?= e((string) $experience['period_label']) ?></p>
                                <?php endif; ?>
                            </header>
                            <p>
                                <?php if (trim((string) $experience['organization']) !== ''): ?>
                                    <?= e((string) $experience['organization']) ?>
                                <?php endif; ?>
                                <?php if (($experience['experience_type'] ?? '') !== ''): ?>
                                    <span><?= e(experience_type_label((string) $experience['experience_type'])) ?></span>
                                <?php endif; ?>
                            </p>
                            <?php if (trim((string) ($experience['description'] ?? '')) !== ''): ?>
                                <p class="timeline-copy"><?= e((string) $experience['description']) ?></p>
                            <?php endif; ?>
                        </article>
                    </li>
                <?php endforeach; ?>
            </ol>
        <?php endif; ?>
    </div>
</section>
