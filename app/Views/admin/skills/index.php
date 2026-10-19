<?php
/** @var array $skills */
/** @var array $categories */
/** @var string $search */
/** @var string $status */
/** @var string $category */
/** @var array $paging */
/** @var bool $filtering */
?>
<header class="admin-heading admin-heading-row">
    <div>
        <h1>Skills</h1>
        <p class="lede">Published skills appear by category. No proficiency scores are stored.</p>
    </div>
    <a class="btn btn-slate" href="<?= e(url('/admin/skills/create')) ?>">Add skill</a>
</header>
<form class="filter-bar" method="get" action="<?= e(url('/admin/skills')) ?>">
    <label for="skill-q">Search</label>
    <input id="skill-q" type="search" name="q" value="<?= e($search) ?>">
    <label for="skill-category">Category</label>
    <select id="skill-category" name="category">
        <option value="">All</option>
        <?php foreach ($categories as $optionValue => $optionLabel): ?>
            <option value="<?= e((string) $optionValue) ?>"<?= $category === (string) $optionValue ? ' selected' : '' ?>><?= e((string) $optionLabel) ?></option>
        <?php endforeach; ?>
    </select>
    <label for="skill-status">Visibility</label>
    <select id="skill-status" name="status">
        <option value="">All</option>
        <option value="draft"<?= $status === 'draft' ? ' selected' : '' ?>>Draft</option>
        <option value="published"<?= $status === 'published' ? ' selected' : '' ?>>Published</option>
    </select>
    <button class="btn btn-line" type="submit">Filter</button>
</form>
<?php if ($skills === []): ?>
    <p class="empty-state"><?= e($filtering ? 'No skills match this filter.' : 'No skills have been saved yet.') ?></p>
<?php else: ?>
    <div class="admin-table-wrap">
        <table class="admin-table">
            <thead>
                <tr>
                    <th scope="col">Skill</th>
                    <th scope="col">Category</th>
                    <th scope="col">Order</th>
                    <th scope="col">Status</th>
                    <th scope="col">Actions</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($skills as $skill): ?>
                    <tr>
                        <td><a href="<?= e(url('/admin/skills/' . $skill['id'])) ?>"><?= e((string) $skill['name']) ?></a></td>
                        <td><?= e((string) $skill['category']) ?></td>
                        <td><?= e((string) $skill['display_order']) ?></td>
                        <td><?php status_badge((string) $skill['status']); ?></td>
                        <td><?php record_actions('/admin/skills', (int) $skill['id'], (string) $skill['status']); ?></td>
                    </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    </div>
    <?php pager('/admin/skills', $paging, ['q' => $search, 'status' => $status, 'category' => $category]); ?>
<?php endif; ?>
