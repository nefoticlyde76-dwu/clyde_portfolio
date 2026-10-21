<?php
/** @var array $profile */
/** @var array $education */
/** @var array $selectedExperience */
/** @var array $interests */
?>
<section class="page-hero">
    <div class="container site-container narrow-copy">
        <p class="eyebrow">About</p>
        <?php
        $aboutName = $profile['full_name'] !== '' ? $profile['full_name'] : 'About';
        $aboutParts = preg_split('/\s+/', $aboutName, 2) ?: [$aboutName];
        ?>
        <h1><?= e($aboutParts[0]) ?><?php if (isset($aboutParts[1])): ?> <span class="accent"><?= e($aboutParts[1]) ?></span><?php endif; ?></h1>
        <?php if ($profile['headline'] !== ''): ?>
            <p class="headline"><?= e($profile['headline']) ?></p>
        <?php endif; ?>
        <?php if ($profile['location'] !== ''): ?>
            <p class="meta-line"><?= e($profile['location']) ?></p>
        <?php endif; ?>
    </div>
</section>

<section class="band">
    <div class="container site-container narrow-copy">
        <?php if ($profile['profile_image_url'] !== ''): ?>
            <img class="portrait" src="<?= e($profile['profile_image_url']) ?>" alt="<?= e('Portrait of ' . $profile['full_name']) ?>">
        <?php endif; ?>
        <h2>Background</h2>
        <?php if ($profile['biography'] !== ''): ?>
            <p><?= e($profile['biography']) ?></p>
        <?php elseif ($profile['introduction'] !== ''): ?>
            <p><?= e($profile['introduction']) ?></p>
        <?php else: ?>
            <p class="empty-state">A biography has not been published yet.</p>
        <?php endif; ?>

        <h2>Technical interests</h2>
        <?php if ($interests === []): ?>
            <p class="empty-state">No skill areas are published yet.</p>
        <?php else: ?>
            <ul class="plain-list">
                <?php foreach ($interests as $interest): ?>
                    <li><?= e((string) $interest) ?></li>
                <?php endforeach; ?>
            </ul>
        <?php endif; ?>
        <p><a href="<?= e(url('/experience')) ?>">See skills and experience</a></p>
    </div>
</section>

<section class="band">
    <div class="container site-container narrow-copy">
        <h2>Education</h2>
        <?php if ($education === []): ?>
            <p class="empty-state">No education records are published yet.</p>
        <?php else: ?>
            <?php foreach ($education as $experience): ?>
                <?php require APP_PATH . '/Views/partials/experience-item.php'; ?>
            <?php endforeach; ?>
        <?php endif; ?>

        <h2>Selected experience</h2>
        <?php if ($selectedExperience === []): ?>
            <p class="empty-state">No experience records are published yet.</p>
        <?php else: ?>
            <?php foreach ($selectedExperience as $experience): ?>
                <?php require APP_PATH . '/Views/partials/experience-item.php'; ?>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</section>
