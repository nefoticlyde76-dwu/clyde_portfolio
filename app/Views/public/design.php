<?php
/** @var array $items */
/** @var array $categories */
?>
<section class="page-hero">
    <div class="container site-container">
        <p class="eyebrow">Design</p>
        <h1>Graphic <span class="accent">design</span></h1>
        <p class="lede">Published pieces only. Work without an image, and anything still in draft, is not shown here.</p>
    </div>
</section>
<section class="band">
    <div class="container site-container" data-design-gallery>
        <?php if ($items === []): ?>
            <p class="empty-state">No graphic design pieces are published yet. Logos, posters, and other work appear here after a real image is added.</p>
        <?php else: ?>
            <?php if (count($categories) > 1): ?>
                <div class="filter-row" role="group" aria-label="Filter design work">
                    <button type="button" data-filter="all" aria-pressed="true">All</button>
                    <?php foreach ($categories as $category): ?>
                        <button type="button" data-filter="<?= e((string) $category) ?>" aria-pressed="false"><?= e((string) $category) ?></button>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
            <div class="design-grid">
                <?php foreach ($items as $item): ?>
                    <article class="design-card" data-category="<?= e($item['category']) ?>">
                        <?php if ($item['image_url'] !== ''): ?>
                            <button
                                type="button"
                                class="design-open"
                                data-bs-toggle="modal"
                                data-bs-target="#designViewer"
                                data-image="<?= e($item['image_url']) ?>"
                                data-alt="<?= e($item['alt']) ?>"
                                data-title="<?= e($item['title']) ?>"
                                data-description="<?= e($item['description']) ?>"
                            >
                                <img src="<?= e($item['image_url']) ?>" alt="<?= e($item['alt']) ?>">
                            </button>
                        <?php endif; ?>
                        <div class="design-copy">
                            <?php if ($item['category'] !== ''): ?>
                                <p class="eyebrow"><?= e($item['category']) ?></p>
                            <?php endif; ?>
                            <h2><?= e($item['title']) ?></h2>
                            <?php if ($item['description'] !== ''): ?>
                                <p><?= e($item['description']) ?></p>
                            <?php endif; ?>
                            <?php if ($item['image_url'] === ''): ?>
                                <p class="meta-line">No image has been added for this piece.</p>
                            <?php endif; ?>
                            <?php if ($item['external_url'] !== ''): ?>
                                <p><a href="<?= e($item['external_url']) ?>" rel="noopener noreferrer">External link</a></p>
                            <?php endif; ?>
                        </div>
                    </article>
                <?php endforeach; ?>
            </div>
            <p class="filter-empty" hidden>No pieces in that category are published.</p>
        <?php endif; ?>
    </div>
</section>

<div class="modal fade" id="designViewer" tabindex="-1" aria-labelledby="designViewerTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
            <div class="modal-header">
                <h2 class="modal-title h5" id="designViewerTitle"></h2>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <img id="designViewerImage" alt="">
                <p id="designViewerText"></p>
            </div>
        </div>
    </div>
</div>
