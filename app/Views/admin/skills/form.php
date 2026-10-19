<?php
/** @var string $heading */
/** @var string $lede */
/** @var string $action */
/** @var array $values */
/** @var array $errors */
/** @var array $categories */
/** @var array $statuses */
$error = static fn (string $key): string => (string) ($errors[$key] ?? '');
$value = static fn (string $key): string => (string) ($values[$key] ?? '');
?>
<header class="admin-heading">
    <h1><?= e($heading) ?></h1>
    <p class="lede"><?= e($lede) ?></p>
</header>
<?php form_open($action); ?>
    <?php
    field(['type' => 'text', 'name' => 'name', 'label' => 'Skill', 'value' => $value('name'), 'error' => $error('name'), 'required' => true, 'max' => 120]);
    field(['type' => 'select', 'name' => 'category', 'label' => 'Category', 'value' => $value('category'), 'error' => $error('category'), 'options' => $categories, 'required' => true]);
    field(['type' => 'number', 'name' => 'display_order', 'label' => 'Display order', 'value' => $value('display_order'), 'error' => $error('display_order')]);
    field(['type' => 'select', 'name' => 'status', 'label' => 'Visibility', 'value' => $value('status'), 'error' => $error('status'), 'options' => $statuses, 'required' => true]);
    ?>
    <div class="form-actions">
        <button class="btn btn-slate" type="submit">Save skill</button>
        <a class="btn btn-line" href="<?= e(url('/admin/skills')) ?>">Cancel</a>
    </div>
<?php form_close(); ?>
