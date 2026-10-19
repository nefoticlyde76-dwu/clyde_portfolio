<?php
/** @var array $project */
?>
<article class="project-detail">
    <header class="page-hero">
        <div class="container site-container narrow-copy">
            <p class="eyebrow"><?= e((string) $project['category']) ?></p>
            <h1><?= e((string) $project['title']) ?></h1>
            <p><a href="<?= e(url('/projects')) ?>">All projects</a></p>
        </div>
    </header>

    <div class="container site-container detail-grid">
        <div class="detail-main">
            <?php if (!empty($project['show_summary'])): ?>
                <p class="lede"><?= e($project['summary']) ?></p>
            <?php endif; ?>

            <?php if ($project['overview'] !== ''): ?>
                <h2>Overview</h2>
                <p class="preserve"><?= e($project['overview']) ?></p>
            <?php else: ?>
                <p class="empty-state">An overview has not been added for this project.</p>
            <?php endif; ?>

            <?php if ($project['purpose'] !== ''): ?>
                <h2>Purpose</h2>
                <p class="preserve"><?= e($project['purpose']) ?></p>
            <?php endif; ?>

            <?php if ($project['role'] !== ''): ?>
                <h2>Role</h2>
                <p><?= e($project['role']) ?></p>
            <?php endif; ?>

            <?php if ($project['contribution'] !== ''): ?>
                <h2>Contribution</h2>
                <p class="preserve"><?= e($project['contribution']) ?></p>
            <?php endif; ?>

            <?php if ($project['solution'] !== ''): ?>
                <h2>Solution</h2>
                <p class="preserve"><?= e($project['solution']) ?></p>
            <?php endif; ?>

            <?php if ($project['feature_list'] !== []): ?>
                <h2><?= $project['solution'] !== '' ? 'Features' : 'Solution and implemented features' ?></h2>
                <ul class="feature-list">
                    <?php foreach ($project['feature_list'] as $feature): ?>
                        <li><?= e($feature) ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>

            <?php if ($project['lessons'] !== ''): ?>
                <h2>Challenges and lessons</h2>
                <p class="preserve"><?= e($project['lessons']) ?></p>
            <?php endif; ?>
        </div>
        <aside class="detail-aside">
            <?php if ($project['technology_list'] !== []): ?>
                <h2>Technologies</h2>
                <ul class="label-list">
                    <?php foreach ($project['technology_list'] as $technology): ?>
                        <li><?= e($technology) ?></li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
            <?php if ($project['live_url'] !== '' || $project['repository_url'] !== ''): ?>
                <h2>Links</h2>
                <ul class="plain-list">
                    <?php if ($project['live_url'] !== ''): ?>
                        <li><a href="<?= e($project['live_url']) ?>" rel="noopener noreferrer">Live site</a></li>
                    <?php endif; ?>
                    <?php if ($project['repository_url'] !== ''): ?>
                        <li><a href="<?= e($project['repository_url']) ?>" rel="noopener noreferrer">Source code</a></li>
                    <?php endif; ?>
                </ul>
            <?php endif; ?>
        </aside>
    </div>

    <?php if ($project['cover_url'] !== ''): ?>
        <div class="container site-container">
            <h2>Project image</h2>
            <figure class="project-figure">
                <img src="<?= e($project['cover_url']) ?>" alt="<?= e((string) $project['title']) ?>">
            </figure>
        </div>
    <?php endif; ?>
</article>
