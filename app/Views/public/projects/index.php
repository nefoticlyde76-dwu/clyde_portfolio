<?php
/** @var array $projects */
?>
<section class="page-hero">
    <div class="container site-container">
        <p class="eyebrow">My work</p>
        <h1>Pro<span class="accent">jects</span></h1>
        <p class="lede">Software and systems work that has been published. Draft projects stay off this page.</p>
    </div>
</section>
<section class="band">
    <div class="container site-container">
        <?php if ($projects === []): ?>
            <p class="empty-state">No projects are published yet.</p>
        <?php else: ?>
            <div class="work-board">
                <?php foreach ($projects as $index => $project): ?>
                    <a class="work-card<?= $project['cover_url'] === '' ? ' is-panel' : '' ?>" href="<?= e(url('/projects/' . $project['slug'])) ?>">
                        <?php if ($project['cover_url'] !== ''): ?>
                            <span class="work-visual">
                                <img src="<?= e($project['cover_url']) ?>" alt="<?= e($project['title'] . ' display image') ?>">
                            </span>
                            <span class="work-caption">
                                <span><?= e(str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)) ?></span>
                                <span>
                                    <strong><?= e((string) $project['title']) ?></strong>
                                    <?php if (($project['category'] ?? '') !== ''): ?>
                                        <em><?= e((string) $project['category']) ?></em>
                                    <?php endif; ?>
                                </span>
                                <span aria-hidden="true">→</span>
                            </span>
                        <?php else: ?>
                            <?php if (($project['category'] ?? '') !== ''): ?>
                                <span class="work-kicker"><?= e((string) $project['category']) ?> <span aria-hidden="true">+</span></span>
                            <?php endif; ?>
                            <strong><?= e((string) $project['title']) ?></strong>
                            <?php if (($project['summary'] ?? '') !== ''): ?>
                                <p><?= e((string) $project['summary']) ?></p>
                            <?php endif; ?>
                            <span class="work-caption">
                                <span><?= e(str_pad((string) ($index + 1), 2, '0', STR_PAD_LEFT)) ?></span>
                                <em><?= e((string) ($project['category'] ?? 'Project')) ?></em>
                                <span aria-hidden="true">→</span>
                            </span>
                        <?php endif; ?>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>
