<?php
/** @var array $profile */
/** @var array $errors */
/** @var array $old */
$errors = $errors ?? [];
$old = $old ?? [];
?>
<section class="page-hero">
    <div class="container site-container narrow-copy">
        <p class="eyebrow">Contact</p>
        <h1>Con<span class="accent">tact</span></h1>
        <p class="lede">Send a message and it will be saved for review. This form does not send email.</p>
        <?php if ($profile['location'] !== ''): ?>
            <p class="meta-line"><?= e($profile['location']) ?></p>
        <?php endif; ?>
        <p class="text-links">
            <?php if ($profile['public_email'] !== ''): ?>
                <a href="mailto:<?= e($profile['public_email']) ?>"><?= e($profile['public_email']) ?></a>
            <?php endif; ?>
            <?php if ($profile['phone'] !== ''): ?>
                <a href="tel:<?= e(preg_replace('/[^0-9+]/', '', $profile['phone']) ?? '') ?>"><?= e($profile['phone']) ?></a>
            <?php endif; ?>
            <?php if ($profile['linkedin_url'] !== ''): ?>
                <a href="<?= e($profile['linkedin_url']) ?>" rel="noopener noreferrer">LinkedIn</a>
            <?php endif; ?>
            <?php if ($profile['github_url'] !== ''): ?>
                <a href="<?= e($profile['github_url']) ?>" rel="noopener noreferrer">GitHub</a>
            <?php endif; ?>
        </p>
    </div>
</section>
<section class="band">
    <div class="container site-container narrow-copy">
        <h2>Send a message</h2>
        <?php if ($errors !== []): ?>
            <div class="form-alert" role="alert">
                <p><span class="state-label">Error.</span> Check the fields below.</p>
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?= e((string) $error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>
        <form class="contact-form" method="post" action="<?= e(url('/contact')) ?>">
            <?= csrf_field() ?>
            <div class="hp-field" aria-hidden="true">
                <label for="website">Website</label>
                <input id="website" name="website" type="text" tabindex="-1" autocomplete="off">
            </div>
            <div class="field">
                <label for="name">Name</label>
                <input id="name" name="name" type="text" maxlength="120" required autocomplete="name" value="<?= e((string) ($old['name'] ?? '')) ?>"<?= isset($errors['name']) ? ' aria-invalid="true" aria-describedby="name-error"' : '' ?>>
                <?php if (isset($errors['name'])): ?>
                    <p id="name-error" class="field-error"><span class="state-label">Error.</span> <?= e($errors['name']) ?></p>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="email">Email</label>
                <input id="email" name="email" type="email" maxlength="190" required autocomplete="email" value="<?= e((string) ($old['email'] ?? '')) ?>"<?= isset($errors['email']) ? ' aria-invalid="true" aria-describedby="email-error"' : '' ?>>
                <?php if (isset($errors['email'])): ?>
                    <p id="email-error" class="field-error"><span class="state-label">Error.</span> <?= e($errors['email']) ?></p>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="subject">Subject</label>
                <input id="subject" name="subject" type="text" maxlength="180" required value="<?= e((string) ($old['subject'] ?? '')) ?>"<?= isset($errors['subject']) ? ' aria-invalid="true" aria-describedby="subject-error"' : '' ?>>
                <?php if (isset($errors['subject'])): ?>
                    <p id="subject-error" class="field-error"><span class="state-label">Error.</span> <?= e($errors['subject']) ?></p>
                <?php endif; ?>
            </div>
            <div class="field">
                <label for="message">Message</label>
                <textarea id="message" name="message" rows="7" maxlength="5000" required<?= isset($errors['message']) ? ' aria-invalid="true" aria-describedby="message-error"' : '' ?>><?= e((string) ($old['message'] ?? '')) ?></textarea>
                <?php if (isset($errors['message'])): ?>
                    <p id="message-error" class="field-error"><span class="state-label">Error.</span> <?= e($errors['message']) ?></p>
                <?php endif; ?>
            </div>
            <button class="btn btn-slate" type="submit">Save message</button>
        </form>
    </div>
</section>
