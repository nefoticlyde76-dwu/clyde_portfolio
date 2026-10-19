<?php
/** @var array $counts */
/** @var array $projects */
/** @var array $messages */
$actions = [
    ['/admin/projects/create', 'New project'],
    ['/admin/certificates/create', 'New certificate'],
    ['/admin/designs/create', 'New design'],
    ['/admin/skills/create', 'New skill'],
    ['/admin/experience/create', 'New experience'],
    ['/admin/profile', 'Edit profile'],
    ['/admin/media', 'Resume and profile image'],
    ['/admin/messages', 'Contact messages'],
];
?>
<header class="admin-heading">
    <p class="eyebrow">Overview</p>
    <h1>Dashboard</h1>
    <p class="lede">Counts are read from the database. Add, edit, publish, or remove content from each section.</p>
</header>

<section class="admin-counts" aria-label="Content counts">
    <article>
        <p>Published projects</p>
        <strong><?= e((string) $counts['projects_published']) ?></strong>
    </article>
    <article>
        <p>Draft projects</p>
        <strong><?= e((string) $counts['projects_draft']) ?></strong>
    </article>
    <article>
        <p>Certificates</p>
        <strong><?= e((string) $counts['certificates']) ?></strong>
    </article>
    <article>
        <p>Design items</p>
        <strong><?= e((string) $counts['design_items']) ?></strong>
    </article>
    <article>
        <p>Unread messages</p>
        <strong><?= e((string) $counts['unread_messages']) ?></strong>
    </article>
</section>

<section class="admin-panel">
    <h2>Quick actions</h2>
    <ul class="admin-actions">
        <?php foreach ($actions as [$path, $label]): ?>
            <li><a href="<?= e(url($path)) ?>"><?= e($label) ?></a></li>
        <?php endforeach; ?>
    </ul>
</section>

<div class="admin-split">
    <section class="admin-panel">
        <h2>Recent projects</h2>
        <?php if ($projects === []): ?>
            <p class="empty-state">No projects have been saved yet.</p>
        <?php else: ?>
            <ul class="admin-activity">
                <?php foreach ($projects as $project): ?>
                    <li>
                        <a href="<?= e(url('/admin/projects/' . $project['id'])) ?>"><?= e((string) $project['title']) ?></a>
                        <span><?= e((string) $project['status']) ?><?= $project['updated_label'] !== '' ? ' · ' . e($project['updated_label']) : '' ?></span>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </section>
    <section class="admin-panel">
        <h2>Recent messages</h2>
        <?php if ($messages === []): ?>
            <p class="empty-state">No messages have been saved yet.</p>
        <?php else: ?>
            <ul class="admin-activity">
                <?php foreach ($messages as $message): ?>
                    <li>
                        <a href="<?= e(url('/admin/messages/' . $message['id'])) ?>"><?= e((string) $message['subject']) ?></a>
                        <span><?= e((string) $message['sender_name']) ?> · <?= e((string) $message['status_label']) ?></span>
                    </li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
    </section>
</div>
