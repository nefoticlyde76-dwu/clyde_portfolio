<?php
/** @var string $content */
/** @var string $title */
/** @var array $profile */
/** @var string $siteName */

$metaDescription = $metaDescription ?? '';
$robots = $robots ?? 'index, follow';
$ogType = $ogType ?? 'website';
$ogImage = $ogImage ?? '';
$includeCanonical = $includeCanonical ?? true;
$canonicalPath = $canonicalPath ?? request_path();
$canonical = url($canonicalPath === '/' ? '/' : $canonicalPath);
$personName = $profile['full_name'] !== '' ? $profile['full_name'] : $siteName;
?>
<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title><?= e($title) ?></title>
    <?php if ($metaDescription !== ''): ?>
        <meta name="description" content="<?= e($metaDescription) ?>">
    <?php endif; ?>
    <meta name="robots" content="<?= e($robots) ?>">
    <meta name="theme-color" content="#09090B">
    <?php if ($includeCanonical): ?>
        <link rel="canonical" href="<?= e($canonical) ?>">
    <?php endif; ?>
    <meta property="og:site_name" content="<?= e($personName) ?>">
    <meta property="og:title" content="<?= e($title) ?>">
    <?php if ($metaDescription !== ''): ?>
        <meta property="og:description" content="<?= e($metaDescription) ?>">
    <?php endif; ?>
    <?php if ($includeCanonical): ?>
        <meta property="og:url" content="<?= e($canonical) ?>">
    <?php endif; ?>
    <meta property="og:type" content="<?= e($ogType) ?>">
    <?php if ($ogImage !== ''): ?>
        <meta property="og:image" content="<?= e($ogImage) ?>">
    <?php endif; ?>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@500;600&family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>">
</head>
<body class="<?= request_path() === '/' ? 'is-home' : 'is-page' ?>">
    <a class="skip-link" href="#content">Skip to content</a>
    <?php require APP_PATH . '/Views/partials/nav.php'; ?>
    <main id="content" class="site-main">
        <?php require APP_PATH . '/Views/partials/flash.php'; ?>
        <?= $content ?>
    </main>
    <?php require APP_PATH . '/Views/partials/footer.php'; ?>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
    <script src="<?= e(asset('js/app.js')) ?>"></script>
</body>
</html>
