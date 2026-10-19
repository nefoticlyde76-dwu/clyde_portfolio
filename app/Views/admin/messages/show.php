<?php
/** @var array $message */
$isRead = (int) $message['is_read'] === 1;
$email = filter_var((string) $message['sender_email'], FILTER_VALIDATE_EMAIL) ? (string) $message['sender_email'] : '';
?>
<header class="admin-heading">
    <p class="eyebrow"><?= e(format_date((string) $message['created_at'], 'j M Y, g:i a')) ?></p>
    <h1><?= e((string) $message['subject']) ?></h1>
    <p class="lede"><?php status_badge($isRead ? 'read' : 'unread'); ?></p>
</header>
<dl class="fact-list">
    <div><dt>From</dt><dd><?= e((string) $message['sender_name']) ?></dd></div>
    <div>
        <dt>Email</dt>
        <dd><?php if ($email !== ''): ?><a href="mailto:<?= e($email) ?>"><?= e($email) ?></a><?php else: ?><?= e((string) $message['sender_email']) ?><?php endif; ?></dd>
    </div>
</dl>
<div class="message-body"><?= e((string) $message['message']) ?></div>
<div class="admin-record-actions">
    <form method="post" action="<?= e(url('/admin/messages/' . $message['id'] . '/read')) ?>">
        <?= csrf_field() ?>
        <input type="hidden" name="return" value="<?= e('/admin/messages/' . $message['id']) ?>">
        <input type="hidden" name="is_read" value="<?= $isRead ? '0' : '1' ?>">
        <button class="btn btn-line" type="submit"><?= $isRead ? 'Mark unread' : 'Mark read' ?></button>
    </form>
    <a class="btn btn-line" href="<?= e(url('/admin/messages/' . $message['id'] . '/delete')) ?>">Delete</a>
    <a class="btn btn-line" href="<?= e(url('/admin/messages')) ?>">All messages</a>
</div>
