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
    field(['type' => 'text', 'name' => 'category', 'label' => 'Category', 'value' => $value('category'), 'error' => $error('category'), 'required' => true, 'max' => 80]);
    field(['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $value('description'), 'error' => $error('description'), 'max' => 8000]);
    field(['type' => 'url', 'name' => 'external_url', 'label' => 'External link', 'value' => $value('external_url'), 'error' => $error('external_url'), 'max' => 255]);
    field(['type' => 'number', 'name' => 'display_order', 'label' => 'Display order', 'value' => $value('display_order'), 'error' => $error('display_order')]);
    field(['type' => 'select', 'name' => 'status', 'label' => 'Status', 'value' => $value('status'), 'error' => $error('status'), 'options' => $statuses, 'required' => true]);
    field(['type' => 'checkbox', 'name' => 'is_featured', 'label' => 'Featured', 'checked' => (int) ($values['is_featured'] ?? 0) === 1]);
    field(['type' => 'file', 'name' => 'design_image', 'label' => 'Image', 'error' => $error('design_image'), 'accept' => 'image/jpeg,image/png,image/gif,image/webp', 'preview' => $preview, 'preview_label' => 'Current image', 'help' => 'JPG, PNG, GIF, or WebP. 5 MB maximum.']);
    if ($preview !== '') {
        field(['type' => 'checkbox', 'name' => 'remove_image', 'label' => 'Remove the current image', 'checked' => (int) ($values['remove_image'] ?? 0) === 1]);
    }
    ?>
    <div class="form-actions">
        <button class="btn btn-slate" type="submit">Save design</button>
        <a class="btn btn-line" href="<?= e(url('/admin/designs')) ?>">Cancel</a>
    </div>
<?php form_close(); ?>
