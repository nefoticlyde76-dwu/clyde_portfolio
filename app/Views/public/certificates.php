<?php
/** @var array $certificates */
?>
<section class="page-hero">
    <div class="container site-container narrow-copy">
        <p class="eyebrow">Credentials</p>
        <h1>Certificates</h1>
        <p class="lede">Only certificates that have been published are listed. None are added unless the record exists.</p>
    </div>
</section>
<section class="band">
    <div class="container site-container">
        <?php if ($certificates === []): ?>
            <p class="empty-state">No certificates are published yet.</p>
        <?php else: ?>
            <div class="media-grid">
                <?php foreach ($certificates as $certificate): ?>
                    <?php if ($certificate['display_url'] !== ''): ?>
                        <?php
                        $glowHref = url('/certificates/' . $certificate['id']);
                        $glowImage = $certificate['display_url'];
                        $glowTitle = $certificate['title'];
                        $glowMeta = implode(' · ', array_filter([
                            $certificate['issuing_organization'],
                            $certificate['issued_label'],
                        ], static fn (string $part): bool => $part !== ''));
                        require APP_PATH . '/Views/partials/glow-card.php';
                        ?>
                    <?php else: ?>
                        <article class="entry">
                            <header class="entry-head">
                                <h2><a href="<?= e(url('/certificates/' . $certificate['id'])) ?>"><?= e($certificate['title']) ?></a></h2>
                                <?php if ($certificate['issued_label'] !== ''): ?>
                                    <p class="period"><?= e($certificate['issued_label']) ?></p>
                                <?php endif; ?>
                            </header>
                            <?php if ($certificate['issuing_organization'] !== ''): ?>
                                <p class="org"><?= e($certificate['issuing_organization']) ?></p>
                            <?php endif; ?>
                            <?php if ($certificate['description'] !== ''): ?>
                                <p><?= e($certificate['description']) ?></p>
                            <?php endif; ?>
                            <p class="card-links">
                                <a href="<?= e(url('/certificates/' . $certificate['id'])) ?>">Read more</a>
                            </p>
                        </article>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>
