<?php
/** @var array $certificates */
/** @var string $search */
/** @var string $status */
/** @var array $paging */
/** @var bool $filtering */
?>
<header class="admin-heading admin-heading-row">
    <div>
        <h1>Certificates</h1>
        <p class="lede">No certificate is added automatically. Use Add certificate for a real credential, and leave the issue date blank when you do not know it.</p>
    </div>
    <a class="btn btn-slate" href="<?= e(url('/admin/certificates/create')) ?>">Add certificate</a>
</header>
<form class="filter-bar" method="get" action="<?= e(url('/admin/certificates')) ?>">
    <label for="certificate-q">Search</label>
    <input id="certificate-q" type="search" name="q" value="<?= e($search) ?>">
    <label for="certificate-status">Status</label>
    <select id="certificate-status" name="status">
        <option value="">All</option>
        <option value="draft"<?= $status === 'draft' ? ' selected' : '' ?>>Draft</option>
        <option value="published"<?= $status === 'published' ? ' selected' : '' ?>>Published</option>
    </select>
    <button class="btn btn-line" type="submit">Filter</button>
</form>
<?php if ($certificates === []): ?>
    <p class="empty-state"><?= e($filtering ? 'No certificates match this filter.' : 'No certificates have been saved yet. Choose Add certificate to enter one. It stays off the public site until you publish it.') ?></p>
<?php else: ?>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Issuer</th>
                    <th scope="col">Issued</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($certificates as $certificate): ?>
                    <tr>
                        <td><a href="<?= e(url('/admin/certificates/' . $certificate['id'])) ?>"><?= e((string) $certificate['title']) ?></a></td>
                        <td><?= e((string) $certificate['issuing_organization']) ?></td>
                        <td><?= e(format_date((string) ($certificate['issued_on'] ?? '')) ?: 'Not set') ?></td>
                        <td><?php status_badge((string) $certificate['status']); ?></td>
                        <td><?php record_actions('/admin/certificates', (int) $certificate['id'], (string) $certificate['status']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php pager('/admin/certificates', $paging, ['q' => $search, 'status' => $status]); ?>
<?php endif; ?>
