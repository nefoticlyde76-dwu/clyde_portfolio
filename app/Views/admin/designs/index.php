<?php
/** @var array $designs */
/** @var array $categories */
/** @var string $search */
/** @var string $status */
/** @var string $category */
/** @var array $paging */
/** @var bool $filtering */
?>
<header class="admin-heading admin-heading-row">
    <div>
        <h1>Graphic designs</h1>
        <p class="lede">Published pieces need an image. Drafts stay off the public gallery.</p>
    </div>
    <a class="btn btn-slate" href="<?= e(url('/admin/designs/create')) ?>">Add design</a>
</header>
<form class="filter-bar" method="get" action="<?= e(url('/admin/designs')) ?>">
    <label for="design-q">Search</label>
    <input id="design-q" type="search" name="q" value="<?= e($search) ?>">
    <label for="design-category">Category</label>
    <select id="design-category" name="category">
        <option value="">All</option>
        <?php foreach ($categories as $option): ?>
            <option value="<?= e((string) $option) ?>"<?= $category === (string) $option ? ' selected' : '' ?>><?= e((string) $option) ?></option>
        <?php endforeach; ?>
    </select>
    <label for="design-status">Status</label>
    <select id="design-status" name="status">
        <option value="">All</option>
        <option value="draft"<?= $status === 'draft' ? ' selected' : '' ?>>Draft</option>
        <option value="published"<?= $status === 'published' ? ' selected' : '' ?>>Published</option>
    </select>
    <button class="btn btn-line" type="submit">Filter</button>
</form>
<?php if ($designs === []): ?>
    <p class="empty-state"><?= e($filtering ? 'No design pieces match this filter.' : 'No design pieces have been saved yet.') ?></p>
<?php else: ?>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($designs as $design): ?>
                    <tr>
                        <td><a href="<?= e(url('/admin/designs/' . $design['id'])) ?>"><?= e((string) $design['title']) ?></a></td>
                        <td><?= e((string) $design['category']) ?></td>
                        <td><?php status_badge((string) $design['status']); ?></td>
                        <td><?php record_actions('/admin/designs', (int) $design['id'], (string) $design['status']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php pager('/admin/designs', $paging, ['q' => $search, 'status' => $status, 'category' => $category]); ?>
<?php endif; ?>
