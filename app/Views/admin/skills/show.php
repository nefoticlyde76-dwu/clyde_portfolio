<?php /** @var array $skill */ ?>
<header class="admin-heading admin-heading-row">
    <div>
        <p class="eyebrow"><?= e((string) $skill['category']) ?></p>
        <h1><?= e((string) $skill['name']) ?></h1>
        <p class="lede"><?php status_badge((string) $skill['status']); ?></p>
    </div>
    <?php record_actions('/admin/skills', (int) $skill['id'], (string) $skill['status']); ?>
</header>
<dl class="fact-list">
    <div><dt>Display order</dt><dd><?= e((string) $skill['display_order']) ?></dd></div>
</dl>
