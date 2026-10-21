<?php
/** @var string $heading */
/** @var string $message */
?>
<section class="page-hero">
    <div class="container site-container narrow-copy">
        <p class="eyebrow">404</p>
        <h1>Page not <span class="accent">found</span></h1>
        <p class="lede"><?= e($message ?? 'That page is not available.') ?></p>
        <ul class="plain-list">
            <li><a href="<?= e(url('/')) ?>">Home</a></li>
            <li><a href="<?= e(url('/projects')) ?>">Projects</a></li>
            <li><a href="<?= e(url('/contact')) ?>">Contact</a></li>
        </ul>
    </div>
</section>
