<?php
/** @var array $projects */
?>
<section class="page-hero">
    <div class="container site-container">
        <p class="eyebrow">Work</p>
        <h1>Projects</h1>
        <p class="lede">Software and systems work that has been published. Draft projects stay off this page.</p>
    </div>
</section>
<section class="band">
    <div class="container site-container">
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
