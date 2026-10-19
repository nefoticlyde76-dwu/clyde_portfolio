<?php
/** @var string $heading */
/** @var string $lede */
/** @var string $resumeUrl */
/** @var string $imageUrl */
/** @var array $errors */
/** @var bool $removeResume */
$removeResume = $removeResume ?? false;
?>
<header class="admin-heading">
    <h1><?= e($heading) ?></h1>
    <p class="lede"><?= e($lede) ?></p>
</header>
<section class="admin-panel">
    <h2>Profile image</h2>
    <?php if ($imageUrl !== ''): ?>
        <figure class="admin-preview"><img src="<?= e($imageUrl) ?>" alt=""></figure>
    <?php else: ?>
        <p class="empty-state">No profile image has been uploaded.</p>
    <?php endif; ?>
    <p><a href="<?= e(url('/admin/profile')) ?>">Replace the profile image on the profile form</a></p>
</section>
<section class="admin-panel">
    <h2>Resume</h2>
    <?php form_open('/admin/media', true); ?>
        <?php
        field([
            'type' => 'file',
            'name' => 'resume_file',
            'label' => 'PDF resume',
            'error' => (string) ($errors['resume_file'] ?? ''),
            'accept' => 'application/pdf',
            'preview' => $resumeUrl,
            'preview_label' => 'Download current resume',
            'help' => 'PDF only. 8 MB maximum. The public download link appears only while this file is saved.',
        ]);
        if ($resumeUrl !== '') {
            field(['type' => 'checkbox', 'name' => 'remove_resume', 'label' => 'Remove the current resume', 'checked' => $removeResume]);
        }
        ?>
        <div class="form-actions">
            <button class="btn btn-slate" type="submit">Save resume</button>
        </div>
    <?php form_close(); ?>
</section>
