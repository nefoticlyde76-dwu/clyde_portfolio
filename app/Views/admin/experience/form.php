<?php
/** @var string $heading */
/** @var string $lede */
/** @var string $action */
/** @var array $values */
/** @var array $errors */
/** @var array $types */
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
    field(['type' => 'text', 'name' => 'title', 'label' => 'Role', 'value' => $value('title'), 'error' => $error('title'), 'required' => true, 'max' => 160]);
    field(['type' => 'text', 'name' => 'organization', 'label' => 'Organization', 'value' => $value('organization'), 'error' => $error('organization'), 'required' => true, 'max' => 180]);
    field(['type' => 'select', 'name' => 'experience_type', 'label' => 'Type', 'value' => $value('experience_type'), 'error' => $error('experience_type'), 'options' => $types, 'required' => true]);
    field(['type' => 'text', 'name' => 'period_label', 'label' => 'Period', 'value' => $value('period_label'), 'error' => $error('period_label'), 'max' => 80, 'help' => 'Shown on the public site. Leave blank to build it from the dates.']);
    field(['type' => 'date', 'name' => 'started_on', 'label' => 'Start date', 'value' => $value('started_on'), 'error' => $error('started_on')]);
    field(['type' => 'date', 'name' => 'ended_on', 'label' => 'End date', 'value' => $value('ended_on'), 'error' => $error('ended_on'), 'help' => 'Leave this blank for a current role.']);
    field(['type' => 'checkbox', 'name' => 'is_current', 'label' => 'This is a current experience', 'checked' => (int) ($values['is_current'] ?? 0) === 1]);
    field(['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $value('description'), 'error' => $error('description'), 'max' => 8000]);
    field(['type' => 'number', 'name' => 'display_order', 'label' => 'Display order', 'value' => $value('display_order'), 'error' => $error('display_order')]);
    field(['type' => 'select', 'name' => 'status', 'label' => 'Status', 'value' => $value('status'), 'error' => $error('status'), 'options' => $statuses, 'required' => true]);
    ?>
    <div class="form-actions">
        <button class="btn btn-slate" type="submit">Save experience</button>
        <a class="btn btn-line" href="<?= e(url('/admin/experience')) ?>">Cancel</a>
    </div>
<?php form_close(); ?>
