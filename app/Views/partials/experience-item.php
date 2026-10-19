<?php
/** @var array $experience */
?>
<article class="entry">
    <header class="entry-head">
        <h3><?= e((string) $experience['title']) ?></h3>
        <p class="period"><?= e((string) $experience['period_label']) ?></p>
    </header>
    <p class="org"><?= e((string) $experience['organization']) ?></p>
    <?php if (trim((string) ($experience['description'] ?? '')) !== ''): ?>
        <p><?= e((string) $experience['description']) ?></p>
    <?php endif; ?>
</article>
