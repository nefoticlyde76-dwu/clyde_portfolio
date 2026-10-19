<?php
/** @var string $heading */
/** @var string $lede */
/** @var string $action */
/** @var array $values */
/** @var array $errors */
/** @var string $preview */
/** @var array $statuses */
$error = static fn (string $key): string => (string) ($errors[$key] ?? '');
$value = static fn (string $key): string => (string) ($values[$key] ?? '');
?>
<header class="admin-heading">
    <h1><?= e($heading) ?></h1>
    <p class="lede"><?= e($lede) ?></p>
</header>
<?php form_open($action, true); ?>
    <?php
    field(['type' => 'text', 'name' => 'title', 'label' => 'Title', 'value' => $value('title'), 'error' => $error('title'), 'required' => true, 'max' => 160]);
    field(['type' => 'text', 'name' => 'slug', 'label' => 'Slug', 'value' => $value('slug'), 'error' => $error('slug'), 'max' => 180, 'help' => 'Leave this blank to build it from the title. It must stay unique.']);
    field(['type' => 'text', 'name' => 'category', 'label' => 'Category', 'value' => $value('category'), 'error' => $error('category'), 'required' => true, 'max' => 80]);
    field(['type' => 'textarea', 'name' => 'summary', 'label' => 'Short description', 'value' => $value('summary'), 'error' => $error('summary'), 'required' => true, 'max' => 500]);
    field(['type' => 'textarea', 'name' => 'overview', 'label' => 'Overview', 'value' => $value('overview'), 'error' => $error('overview'), 'max' => 8000]);
    field(['type' => 'textarea', 'name' => 'purpose', 'label' => 'Problem or purpose', 'value' => $value('purpose'), 'error' => $error('purpose'), 'max' => 8000]);
    field(['type' => 'text', 'name' => 'role', 'label' => 'Role', 'value' => $value('role'), 'error' => $error('role'), 'max' => 180]);
    field(['type' => 'textarea', 'name' => 'contribution', 'label' => 'Contribution', 'value' => $value('contribution'), 'error' => $error('contribution'), 'max' => 8000]);
    field(['type' => 'textarea', 'name' => 'solution', 'label' => 'Solution', 'value' => $value('solution'), 'error' => $error('solution'), 'max' => 8000]);
    field(['type' => 'text', 'name' => 'technologies', 'label' => 'Technologies', 'value' => $value('technologies'), 'error' => $error('technologies'), 'max' => 500, 'help' => 'Separate technologies with commas.']);
    field(['type' => 'textarea', 'name' => 'features', 'label' => 'Features', 'value' => $value('features'), 'error' => $error('features'), 'max' => 8000, 'help' => 'Put one feature on each line.']);
    field(['type' => 'textarea', 'name' => 'lessons', 'label' => 'Challenges and lessons', 'value' => $value('lessons'), 'error' => $error('lessons'), 'max' => 8000]);
    field(['type' => 'url', 'name' => 'live_url', 'label' => 'Live URL', 'value' => $value('live_url'), 'error' => $error('live_url'), 'max' => 255]);
    field(['type' => 'url', 'name' => 'repository_url', 'label' => 'Repository URL', 'value' => $value('repository_url'), 'error' => $error('repository_url'), 'max' => 255]);
    field(['type' => 'number', 'name' => 'display_order', 'label' => 'Display order', 'value' => $value('display_order'), 'error' => $error('display_order')]);
    field(['type' => 'select', 'name' => 'status', 'label' => 'Status', 'value' => $value('status'), 'error' => $error('status'), 'options' => $statuses, 'required' => true]);
    field(['type' => 'checkbox', 'name' => 'is_featured', 'label' => 'Featured on the home page', 'checked' => (int) ($values['is_featured'] ?? 0) === 1]);
    field(['type' => 'file', 'name' => 'cover_image', 'label' => 'Display image', 'error' => $error('cover_image'), 'accept' => 'image/jpeg,image/png,image/gif,image/webp', 'preview' => $preview, 'preview_label' => 'Current display image', 'help' => 'This image is the public card. Visitors open the project from the card. JPG, PNG, GIF, or WebP. 5 MB maximum.']);
    if ($preview !== '') {
        field(['type' => 'checkbox', 'name' => 'remove_cover', 'label' => 'Remove the current display image', 'checked' => (int) ($values['remove_cover'] ?? 0) === 1]);
    }
    ?>
    <div class="form-actions">
        <button class="btn btn-slate" type="submit">Save project</button>
        <a class="btn btn-line" href="<?= e(url('/admin/projects')) ?>">Cancel</a>
    </div>
<?php form_close(); ?>
