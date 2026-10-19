<?php
/** @var string $heading */
/** @var string $lede */
/** @var string $message */
/** @var string $action */
/** @var string $return */
?>
<header class="admin-heading">
    <h1><?= e($heading) ?></h1>
    <p class="lede"><?= e($lede) ?></p>
</header>
<section class="admin-panel">
    <p><?= e($message) ?></p>
    <?php form_open($action); ?>
        <div class="form-actions">
            <button class="btn btn-slate" type="submit">Delete</button>
            <a class="btn btn-line" href="<?= e(url($return)) ?>">Keep it</a>
        </div>
    <?php form_close(); ?>
</section>
