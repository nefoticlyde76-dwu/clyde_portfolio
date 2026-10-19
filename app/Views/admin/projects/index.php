<?php
/** @var array $projects */
/** @var string $search */
/** @var string $status */
/** @var array $paging */
/** @var bool $filtering */
?>
<header class="admin-heading admin-heading-row">
    <div>
        <h1>Projects</h1>
        <p class="lede">Draft projects stay off the public site. Published projects use their slug.</p>
    </div>
    <a class="btn btn-slate" href="<?= e(url('/admin/projects/create')) ?>">Add project</a>
</header>
<form class="filter-bar" method="get" action="<?= e(url('/admin/projects')) ?>">
    <label for="project-q">Search</label>
    <input id="project-q" type="search" name="q" value="<?= e($search) ?>">
    <label for="project-status">Status</label>
    <select id="project-status" name="status">
        <option value="">All</option>
        <option value="draft"<?= $status === 'draft' ? ' selected' : '' ?>>Draft</option>
        <option value="published"<?= $status === 'published' ? ' selected' : '' ?>>Published</option>
    </select>
    <button class="btn btn-line" type="submit">Filter</button>
</form>
<?php if ($projects === []): ?>
    <p class="empty-state"><?= e($filtering ? 'No projects match this filter.' : 'No projects have been saved yet.') ?></p>
<?php else: ?>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th scope="col">Title</th>
                    <th scope="col">Category</th>
                    <th scope="col">Status</th>
                    <th scope="col">Updated</th>
                    <th scope="col">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($projects as $project): ?>
                    <tr>
                        <td><a href="<?= e(url('/admin/projects/' . $project['id'])) ?>"><?= e((string) $project['title']) ?></a></td>
                        <td><?= e((string) $project['category']) ?></td>
                        <td><?php status_badge((string) $project['status']); ?></td>
                        <td><?= e(format_date((string) $project['updated_at'])) ?></td>
                        <td><?php record_actions('/admin/projects', (int) $project['id'], (string) $project['status']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php pager('/admin/projects', $paging, ['q' => $search, 'status' => $status]); ?>
<?php endif; ?>
