<?php
/** @var string $heading */
/** @var string $lede */
?>
<header class="admin-heading">
    <h1><?= e($heading) ?></h1>
    <p class="lede"><?= e($lede) ?></p>
</header>
<p><a href="<?= e(url('/admin')) ?>">Back to the dashboard</a></p>
