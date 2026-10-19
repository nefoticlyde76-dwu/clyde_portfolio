<?php
/** @var array $experiences */
/** @var array $types */
/** @var string $search */
/** @var string $status */
/** @var string $type */
/** @var array $paging */
/** @var bool $filtering */
?>
<header class="admin-heading admin-heading-row">
    <div>
        <h1>Experience</h1>
        <p class="lede">Work, leadership, volunteering, and selected study records.</p>
    </div>
    <a class="btn btn-slate" href="<?= e(url('/admin/experience/create')) ?>">Add experience</a>
</header>
<form class="filter-bar" method="get" action="<?= e(url('/admin/experience')) ?>">
    <label for="experience-q">Search</label>
    <input id="experience-q" type="search" name="q" value="<?= e($search) ?>">
    <label for="experience-type">Type</label>
    <select id="experience-type" name="type">
        <option value="">All</option>
        <?php foreach ($types as $optionValue => $optionLabel): ?>
            <option value="<?= e((string) $optionValue) ?>"<?= $type === (string) $optionValue ? ' selected' : '' ?>><?= e((string) $optionLabel) ?></option>
        <?php endforeach; ?>
    </select>
    <label for="experience-status">Status</label>
    <select id="experience-status" name="status">
        <option value="">All</option>
        <option value="draft"<?= $status === 'draft' ? ' selected' : '' ?>>Draft</option>
        <option value="published"<?= $status === 'published' ? ' selected' : '' ?>>Published</option>
    </select>
    <button class="btn btn-line" type="submit">Filter</button>
</form>
<?php if ($experiences === []): ?>
    <p class="empty-state"><?= e($filtering ? 'No experience records match this filter.' : 'No experience records have been saved yet.') ?></p>
<?php else: ?>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Organization</th>
                    <th scope="col">Period</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($experiences as $experience): ?>
                    <tr>
                        <td><a href="<?= e(url('/admin/experience/' . $experience['id'])) ?>"><?= e((string) $experience['title']) ?></a></td>
                        <td><?= e((string) $experience['organization']) ?></td>
                        <td><?= e((string) $experience['period_label']) ?></td>
                        <td><?php status_badge((string) $experience['status']); ?></td>
                        <td><?php record_actions('/admin/experience', (int) $experience['id'], (string) $experience['status']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php pager('/admin/experience', $paging, ['q' => $search, 'status' => $status, 'type' => $type]); ?>
<?php endif; ?>
