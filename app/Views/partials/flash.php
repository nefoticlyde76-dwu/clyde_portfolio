<?php
$error = flash('error');
$success = flash('success');
?>
<?php if ($error): ?>
    <p class="flash flash-error" role="alert"><span class="state-label">Error.</span> <?= e($error) ?></p>
<?php endif; ?>
<?php if ($success): ?>
    <p class="flash flash-success" role="status"><span class="state-label">Saved.</span> <?= e($success) ?></p>
<?php endif; ?>
