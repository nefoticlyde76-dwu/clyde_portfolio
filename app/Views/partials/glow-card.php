<?php
/** @var string $glowHref */
/** @var string $glowImage */
/** @var string $glowTitle */
/** @var string $glowMeta */
?>
<a class="glow-card" href="<?= e($glowHref) ?>">
    <span class="glow-frame">
        <img src="<?= e($glowImage) ?>" alt="">
    </span>
    <span class="glow-body">
        <span class="glow-title"><?= e($glowTitle) ?></span>
        <?php if ($glowMeta !== ''): ?>
            <span class="glow-meta"><?= e($glowMeta) ?></span>
        <?php endif; ?>
        <span class="glow-more">Read more</span>
    </span>
</a>
