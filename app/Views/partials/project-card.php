<?php
/** @var array $project */
$projectUrl = url('/projects/' . $project['slug']);
$technologies = $project['technology_list'] ?? [];
$hasMeta = $technologies !== [] || $project['live_url'] !== '' || $project['repository_url'] !== '';
if ($project['cover_url'] !== '') {
    $glowHref = $projectUrl;
    $glowImage = $project['cover_url'];
    $glowTitle = (string) $project['title'];
    $glowMeta = (string) $project['category'];
    if (!empty($project['is_featured'])) {
        $glowMeta = trim($glowMeta . ' · Featured');
    }
    require APP_PATH . '/Views/partials/glow-card.php';
    return;
}
?>
<article class="project-card reveal">
    <div class="tilt-card">
        <?php if ($project['cover_url'] !== ''): ?>
            <a class="tilt-frame" href="<?= e($projectUrl) ?>">
                <span class="tilt-cover">
                    <img src="<?= e($project['cover_url']) ?>" alt="">
                </span>
            </a>
        <?php endif; ?>
        <div class="tilt-body">
            <p class="eyebrow">
                <?= e((string) $project['category']) ?>
                <?php if (!empty($project['is_featured'])): ?>
                    <span class="feature-mark">Featured</span>
                <?php endif; ?>
            </p>
            <h2><a href="<?= e($projectUrl) ?>"><?= e((string) $project['title']) ?></a></h2>
            <p><?= e((string) $project['summary']) ?></p>
            <?php if ($hasMeta): ?>
                <div class="tilt-revealer">
                    <div class="tilt-meta">
                        <span class="tilt-dot" aria-hidden="true"></span>
                        <?php if ($technologies !== []): ?>
                            <span><?= e(implode(' · ', $technologies)) ?></span>
                        <?php endif; ?>
                        <a href="<?= e($projectUrl) ?>">Project details</a>
                        <?php if ($project['live_url'] !== ''): ?>
                            <span class="tilt-sep" aria-hidden="true">·</span>
                            <a href="<?= e($project['live_url']) ?>" rel="noopener noreferrer">Live site</a>
                        <?php endif; ?>
                        <?php if ($project['repository_url'] !== ''): ?>
                            <span class="tilt-sep" aria-hidden="true">·</span>
                            <a href="<?= e($project['repository_url']) ?>" rel="noopener noreferrer">Source code</a>
                        <?php endif; ?>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>
</article>
