<?php
/** @var string $heading */
/** @var string $lede */
/** @var string $action */
/** @var array $values */
/** @var array $errors */
/** @var string $preview */
/** @var string $imagePreview */
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
    field(['type' => 'text', 'name' => 'title', 'label' => 'Title', 'value' => $value('title'), 'error' => $error('title'), 'required' => true, 'max' => 180]);
    field(['type' => 'text', 'name' => 'issuing_organization', 'label' => 'Issuer', 'value' => $value('issuing_organization'), 'error' => $error('issuing_organization'), 'required' => true, 'max' => 180]);
    field(['type' => 'date', 'name' => 'issued_on', 'label' => 'Issue date', 'value' => $value('issued_on'), 'error' => $error('issued_on'), 'help' => 'Leave this blank when you do not know the exact date.']);
    field(['type' => 'text', 'name' => 'credential_id', 'label' => 'Credential ID', 'value' => $value('credential_id'), 'error' => $error('credential_id'), 'max' => 120]);
    field(['type' => 'url', 'name' => 'credential_url', 'label' => 'Credential URL', 'value' => $value('credential_url'), 'error' => $error('credential_url'), 'max' => 255]);
    field(['type' => 'textarea', 'name' => 'description', 'label' => 'Description', 'value' => $value('description'), 'error' => $error('description'), 'max' => 8000]);
    field(['type' => 'number', 'name' => 'display_order', 'label' => 'Display order', 'value' => $value('display_order'), 'error' => $error('display_order')]);
    field(['type' => 'select', 'name' => 'status', 'label' => 'Visibility', 'value' => $value('status'), 'error' => $error('status'), 'options' => $statuses, 'required' => true]);
    field(['type' => 'file', 'name' => 'display_image', 'label' => 'Display image', 'error' => $error('display_image'), 'accept' => 'image/jpeg,image/png,image/gif,image/webp', 'preview' => $imagePreview, 'preview_label' => 'Current display image', 'help' => 'This image is the public card. Visitors open the certificate from the card. JPG, PNG, GIF, or WebP. 5 MB maximum.']);
    if ($imagePreview !== '') {
        field(['type' => 'checkbox', 'name' => 'remove_image', 'label' => 'Remove the current display image', 'checked' => (int) ($values['remove_image'] ?? 0) === 1]);
    }
    field(['type' => 'file', 'name' => 'certificate_file', 'label' => 'Certificate file', 'error' => $error('certificate_file'), 'accept' => 'image/jpeg,image/png,image/gif,image/webp,application/pdf', 'preview' => $preview, 'preview_label' => 'Current certificate file', 'help' => 'JPG, PNG, GIF, WebP, or PDF. 8 MB maximum. An image file is also used as the card when no display image is set.']);
    if ($preview !== '') {
        field(['type' => 'checkbox', 'name' => 'remove_file', 'label' => 'Remove the current file', 'checked' => (int) ($values['remove_file'] ?? 0) === 1]);
    }
    ?>
    <div class="form-actions">
        <button class="btn btn-slate" type="submit">Save certificate</button>
        <a class="btn btn-line" href="<?= e(url('/admin/certificates')) ?>">Cancel</a>
    </div>
<?php form_close(); ?>
