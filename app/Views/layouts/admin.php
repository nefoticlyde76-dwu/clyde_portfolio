<?php
/** @var string $content */
/** @var string $title */
$admin = auth_admin();
$adminName = $admin['name'] ?? '';
$adminEmail = $admin['email'] ?? '';
?>
<!DOCTYPE html>
<html lang="en" class="no-js">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <meta name="theme-color" content="#09090B">
    <title><?= e($title ?? 'Administration') ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@500;600&family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossorigin="anonymous">
    <link rel="stylesheet" href="<?= e(asset('css/app.css')) ?>">
    <link rel="stylesheet" href="<?= e(asset('css/admin.css')) ?>">
</head>
<body class="admin-body">
    <a class="skip-link" href="#content">Skip to content</a>
    <div class="admin-shell">
        <aside class="admin-sidebar d-none d-lg-flex">
            <p class="admin-mark">Administration</p>
            <?php require APP_PATH . '/Views/partials/admin-nav.php'; ?>
        </aside>
        <div class="admin-content">
            <header class="admin-top">
                <button class="admin-menu d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#adminMenu" aria-controls="adminMenu" aria-label="Open administration menu">Menu</button>
                <div class="admin-who">
                    <p><?= e($adminName) ?></p>
                    <?php if ($adminEmail !== ''): ?>
                        <p><?= e($adminEmail) ?></p>
                    <?php endif; ?>
                </div>
                <a class="admin-site-link" href="<?= e(url('/')) ?>" rel="noopener noreferrer">View public website</a>
            </header>
            <main id="content" class="admin-main">
                <?php require APP_PATH . '/Views/partials/flash.php'; ?>
                <?= $content ?>
            </main>
        </div>
    </div>
    <div class="offcanvas offcanvas-start admin-offcanvas" tabindex="-1" id="adminMenu" aria-labelledby="adminMenuLabel">
        <div class="offcanvas-header">
            <h2 class="offcanvas-title" id="adminMenuLabel">Administration</h2>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
        </div>
        <div class="offcanvas-body">
            <?php require APP_PATH . '/Views/partials/admin-nav.php'; ?>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossorigin="anonymous"></script>
    <script src="<?= e(asset('js/admin.js')) ?>"></script>
    <?php if ((string) app_config()['blob_upload_secret'] !== ''): ?>
        <script type="module" src="<?= e(asset('js/admin-blob-upload.bundle.js')) ?>"></script>
    <?php endif; ?>
</body>
</html>
