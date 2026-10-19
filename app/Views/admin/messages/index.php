<?php
/** @var array $messages */
/** @var string $search */
/** @var string $read */
/** @var array $paging */
/** @var bool $filtering */
?>
<header class="admin-heading">
    <h1>Contact messages</h1>
    <p class="lede">Messages are saved from the contact form. They are not sent by email.</p>
</header>
<form class="filter-bar" method="get" action="<?= e(url('/admin/messages')) ?>">
    <label for="message-q">Search</label>
    <input id="message-q" type="search" name="q" value="<?= e($search) ?>">
    <label for="message-read">Status</label>
    <select id="message-read" name="read">
        <option value="">All</option>
        <option value="unread"<?= $read === 'unread' ? ' selected' : '' ?>>Unread</option>
        <option value="read"<?= $read === 'read' ? ' selected' : '' ?>>Read</option>
    </select>
    <button class="btn btn-line" type="submit">Filter</button>
</form>
<?php if ($messages === []): ?>
    <p class="empty-state"><?= e($filtering ? 'No messages match this filter.' : 'No messages have been saved yet.') ?></p>
<?php else: ?>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th scope="col">From</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Received</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($messages as $message): ?>
                    <?php $isRead = (int) $message['is_read'] === 1; ?>
                    <tr>
                        <td><?= e((string) $message['sender_name']) ?></td>
                        <td><a href="<?= e(url('/admin/messages/' . $message['id'])) ?>"><?= e((string) $message['subject']) ?></a></td>
                        <td><?= e(format_date((string) $message['created_at'])) ?></td>
                        <td><?php status_badge($isRead ? 'read' : 'unread'); ?></td>
                        <td>
                            <div class="row-actions">
                                <a href="<?= e(url('/admin/messages/' . $message['id'])) ?>">View</a>
                                <form method="post" action="<?= e(url('/admin/messages/' . $message['id'] . '/read')) ?>">
                                    <?= csrf_field() ?>
                                    <input type="hidden" name="return" value="/admin/messages">
                                    <input type="hidden" name="is_read" value="<?= $isRead ? '0' : '1' ?>">
                                    <button type="submit"><?= $isRead ? 'Mark unread' : 'Mark read' ?></button>
                                </form>
                                <a href="<?= e(url('/admin/messages/' . $message['id'] . '/delete')) ?>">Delete</a>
                            </div>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php pager('/admin/messages', $paging, ['q' => $search, 'read' => $read]); ?>
<?php endif; ?>
