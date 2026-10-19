<?php /** @var array $experience */ ?>
<header class="admin-heading admin-heading-row">
    <div>
        <p class="eyebrow"><?= e(experience_type_label((string) $experience['experience_type'])) ?></p>
        <h1><?= e((string) $experience['title']) ?></h1>
        <p class="lede"><?php status_badge((string) $experience['status']); ?></p>
    </div>
    <?php record_actions('/admin/experience', (int) $experience['id'], (string) $experience['status']); ?>
</header>
<dl class="fact-list">
    <div><dt>Organization</dt><dd><?= e((string) $experience['organization']) ?></dd></div>
    <div><dt>Period</dt><dd><?= e((string) $experience['period_label']) ?></dd></div>
    <div><dt>Start date</dt><dd><?= e(format_date((string) ($experience['started_on'] ?? '')) ?: 'Not set') ?></dd></div>
    <div><dt>End date</dt><dd><?= (int) ($experience['is_current'] ?? 0) === 1 ? 'Current' : (e(format_date((string) ($experience['ended_on'] ?? '')) ?: 'Not set')) ?></dd></div>
    <div><dt>Description</dt><dd class="preserve"><?= trim((string) ($experience['description'] ?? '')) !== '' ? e((string) $experience['description']) : 'Not set' ?></dd></div>
    <div><dt>Display order</dt><dd><?= e((string) $experience['display_order']) ?></dd></div>
</dl>
