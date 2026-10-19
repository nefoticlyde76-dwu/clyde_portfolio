<?php
/** @var array $skillGroups */
/** @var array $experiences */
$groups = [];
foreach ($experiences as $experience) {
    $type = (string) ($experience['experience_type'] ?? '');
    $groups[$type][] = $experience;
}
?>
<section class="page-hero">
    <div class="container site-container">
        <p class="eyebrow">Record</p>
        <h1>Skills and experience</h1>
        <p class="lede">Published skills, education, placements, and independent work.</p>
    </div>
</section>
<section class="band">
    <div class="container site-container">
        <h2>Skills</h2>
        <?php if ($skillGroups === []): ?>
            <p class="empty-state">No skills are published yet.</p>
        <?php else: ?>
            <div class="skill-columns">
                <?php foreach ($skillGroups as $category => $skills): ?>
                    <section>
                        <h3><?= e((string) $category) ?></h3>
                        <ul class="plain-list">
                            <?php foreach ($skills as $skill): ?>
                                <li><?= e((string) $skill['name']) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    </section>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
    </div>
</section>
<section class="band">
    <div class="container site-container narrow-copy">
        <h2>Experience</h2>
        <?php if ($groups === []): ?>
            <p class="empty-state">No experience records are published yet.</p>
        <?php else: ?>
            <?php foreach ($groups as $type => $items): ?>
                <p class="eyebrow"><?= e(experience_type_label((string) $type)) ?></p>
                <?php foreach ($items as $experience): ?>
                    <?php require APP_PATH . '/Views/partials/experience-item.php'; ?>
                <?php endforeach; ?>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</section>
