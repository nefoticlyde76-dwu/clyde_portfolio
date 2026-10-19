<?php
/** @var string $heading */
/** @var string $lede */
/** @var array $values */
/** @var array $errors */
/** @var string $preview */
$error = static fn (string $key): string => (string) ($errors[$key] ?? '');
$value = static fn (string $key): string => (string) ($values[$key] ?? '');
?>
<header class="admin-heading">
    <h1><?= e($heading) ?></h1>
    <p class="lede"><?= e($lede) ?></p>
</header>
<?php form_open('/admin/profile', true); ?>
    <?php
    field(['type' => 'text', 'name' => 'full_name', 'label' => 'Name', 'value' => $value('full_name'), 'error' => $error('full_name'), 'required' => true, 'max' => 120]);
    field(['type' => 'text', 'name' => 'headline', 'label' => 'Headline', 'value' => $value('headline'), 'error' => $error('headline'), 'required' => true, 'max' => 180]);
    field(['type' => 'textarea', 'name' => 'introduction', 'label' => 'Introduction', 'value' => $value('introduction'), 'error' => $error('introduction'), 'required' => true, 'max' => 5000]);
    field(['type' => 'textarea', 'name' => 'biography', 'label' => 'Biography', 'value' => $value('biography'), 'error' => $error('biography'), 'max' => 20000]);
    field(['type' => 'text', 'name' => 'location', 'label' => 'Location', 'value' => $value('location'), 'error' => $error('location'), 'max' => 160]);
    field(['type' => 'email', 'name' => 'public_email', 'label' => 'Public email', 'value' => $value('public_email'), 'error' => $error('public_email'), 'max' => 190]);
    field(['type' => 'text', 'name' => 'phone', 'label' => 'Phone', 'value' => $value('phone'), 'error' => $error('phone'), 'max' => 40, 'help' => 'Optional. Leave blank to hide it.']);
    field(['type' => 'url', 'name' => 'linkedin_url', 'label' => 'LinkedIn URL', 'value' => $value('linkedin_url'), 'error' => $error('linkedin_url'), 'max' => 255]);
    field(['type' => 'url', 'name' => 'github_url', 'label' => 'GitHub URL', 'value' => $value('github_url'), 'error' => $error('github_url'), 'max' => 255]);
    field(['type' => 'text', 'name' => 'seo_title', 'label' => 'SEO title', 'value' => $value('seo_title'), 'error' => $error('seo_title'), 'max' => 160]);
    field(['type' => 'textarea', 'name' => 'seo_description', 'label' => 'SEO description', 'value' => $value('seo_description'), 'error' => $error('seo_description'), 'max' => 320]);
    field(['type' => 'file', 'name' => 'profile_image', 'label' => 'Profile image', 'error' => $error('profile_image'), 'accept' => 'image/jpeg,image/png,image/gif,image/webp', 'preview' => $preview, 'preview_label' => 'Current profile image', 'help' => 'JPG, PNG, GIF, or WebP. 5 MB maximum.']);
    if ($preview !== '') {
        field(['type' => 'checkbox', 'name' => 'remove_image', 'label' => 'Remove the current profile image', 'checked' => (int) ($values['remove_image'] ?? 0) === 1]);
    }
    ?>
    <div class="form-actions">
        <button class="btn btn-slate" type="submit">Save profile</button>
    </div>
<?php form_close(); ?>
