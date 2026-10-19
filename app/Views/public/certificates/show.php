<?php
/** @var array $certificate */
?>
<article class="project-detail">
    <header class="page-hero">
        <div class="container site-container narrow-copy">
            <p class="eyebrow">Certificate</p>
            <h1><?= e($certificate['title']) ?></h1>
            <?php if ($certificate['issuing_organization'] !== ''): ?>
                <p class="lede"><?= e($certificate['issuing_organization']) ?></p>
            <?php endif; ?>
            <?php if ($certificate['issued_label'] !== ''): ?>
                <p class="meta-line"><?= e($certificate['issued_label']) ?></p>
            <?php endif; ?>
            <p><a href="<?= e(url('/certificates')) ?>">All certificates</a></p>
        </div>
    </header>
    <div class="container site-container narrow-copy">
        <?php if ($certificate['description'] !== ''): ?>
            <p class="preserve"><?= e($certificate['description']) ?></p>
        <?php endif; ?>
        <?php if ($certificate['credential_id'] !== ''): ?>
            <p class="meta-line">Credential ID <?= e($certificate['credential_id']) ?></p>
        <?php endif; ?>
        <?php if ($certificate['credential_url'] !== '' || $certificate['file_url'] !== ''): ?>
            <p class="card-links">
                <?php if ($certificate['credential_url'] !== ''): ?>
                    <a href="<?= e($certificate['credential_url']) ?>" rel="noopener noreferrer">Credential link</a>
                <?php endif; ?>
                <?php if ($certificate['file_url'] !== ''): ?>
                    <a href="<?= e($certificate['file_url']) ?>" rel="noopener noreferrer"><?= $certificate['file_is_image'] ? 'View credential image' : 'Open credential file' ?></a>
                <?php endif; ?>
            </p>
        <?php endif; ?>
    </div>
    <?php if ($certificate['display_url'] !== ''): ?>
        <div class="container site-container">
            <figure class="project-figure">
                <img src="<?= e($certificate['display_url']) ?>" alt="<?= e($certificate['title']) ?>">
            </figure>
        </div>
    <?php endif; ?>
</article>
