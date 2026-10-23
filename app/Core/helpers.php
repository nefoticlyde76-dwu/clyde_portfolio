<?php

declare(strict_types=1);

/**
 * Shared helpers used by controllers and views.
 * Templates escape output with e() and build links with url().
 */

function app_config(): array
{
    static $config = null;

    if ($config === null) {
        $loaded = require ROOT_PATH . '/config/database.php';
        if (!is_array($loaded)) {
            throw new RuntimeException('Application configuration could not be loaded.');
        }
        $config = $loaded;
    }

    return $config;
}

function app_log(string $message): void
{
    $line = date('c') . ' ' . $message . PHP_EOL;
    @file_put_contents(STORAGE_PATH . '/logs/app.log', $line, FILE_APPEND);
}

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function url(string $path = ''): string
{
    $base = rtrim((string) app_config()['base_url'], '/');
    if ($path === '' || $path === '/') {
        return $base . '/';
    }

    return $base . '/' . ltrim($path, '/');
}

function asset(string $path): string
{
    $relative = 'assets/' . ltrim($path, '/');
    $absolute = PUBLIC_PATH . '/' . $relative;
    $url = url($relative);
    if (!is_file($absolute)) {
        return $url;
    }

    return $url . '?v=' . filemtime($absolute);
}

function redirect(string $path): never
{
    header('Location: ' . url($path));
    exit;
}

function request_method(): string
{
    return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
}

function request_path(): string
{
    if (isset($_GET['r']) && is_string($_GET['r']) && $_GET['r'] !== '') {
        $path = $_GET['r'];
    } else {
        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);
        $path = is_string($path) ? $path : '/';

        $basePath = parse_url((string) app_config()['base_url'], PHP_URL_PATH);
        $basePath = is_string($basePath) ? rtrim($basePath, '/') : '';

        if ($basePath !== '' && str_starts_with($path, $basePath)) {
            $path = substr($path, strlen($basePath));
        }

        if (str_starts_with($path, '/index.php')) {
            $path = substr($path, strlen('/index.php'));
        }
    }

    $path = '/' . trim((string) $path, '/');

    return $path === '/' ? '/' : rtrim($path, '/');
}

function flash(string $key, ?string $message = null): ?string
{
    if ($message !== null) {
        $_SESSION['_flash'][$key] = $message;
        return null;
    }

    if (!isset($_SESSION['_flash'][$key])) {
        return null;
    }

    $value = (string) $_SESSION['_flash'][$key];
    unset($_SESSION['_flash'][$key]);

    return $value;
}

function csrf_token(): string
{
    if (empty($_SESSION['_csrf']) || !is_string($_SESSION['_csrf'])) {
        $_SESSION['_csrf'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['_csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

function csrf_validate(?string $token): bool
{
    $known = $_SESSION['_csrf'] ?? '';

    return is_string($token) && is_string($known) && $known !== '' && hash_equals($known, $token);
}

function auth_admin(): ?array
{
    $admin = $_SESSION['admin'] ?? null;
    if (!is_array($admin) || !isset($admin['id'], $admin['name'], $admin['email'])) {
        return null;
    }

    return [
        'id' => (int) $admin['id'],
        'name' => (string) $admin['name'],
        'email' => (string) $admin['email'],
    ];
}

function auth_check(): bool
{
    return auth_admin() !== null;
}

function auth_login(array $admin): void
{
    session_regenerate_id(true);
    $_SESSION['admin'] = [
        'id' => (int) $admin['id'],
        'name' => (string) $admin['name'],
        'email' => (string) $admin['email'],
    ];
}

function auth_logout(): void
{
    unset($_SESSION['admin']);
    session_regenerate_id(true);
}

function require_auth(): void
{
    if (!auth_check()) {
        flash('error', 'Sign in to continue.');
        redirect('/admin/login');
    }
}

function format_date(?string $value, string $format = 'j M Y'): string
{
    if ($value === null || trim($value) === '') {
        return '';
    }

    $time = strtotime($value);
    if ($time === false) {
        return '';
    }

    return date($format, $time);
}

function safe_url(?string $value): ?string
{
    $value = trim((string) $value);
    if ($value === '' || strlen($value) > 255) {
        return null;
    }

    if (filter_var($value, FILTER_VALIDATE_URL) === false) {
        return null;
    }

    $scheme = strtolower((string) parse_url($value, PHP_URL_SCHEME));
    if (!in_array($scheme, ['http', 'https'], true)) {
        return null;
    }

    return $value;
}

function safe_phone(?string $value): string
{
    $value = trim((string) $value);
    if ($value === '' || strlen($value) > 40 || !preg_match('/^[0-9+().\\-\\s]{6,40}$/', $value)) {
        return '';
    }

    return $value;
}

function media_url(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));
    if ($path === '' || str_contains($path, '..') || str_contains($path, '://')) {
        return null;
    }

    $path = ltrim($path, '/');
    if (!preg_match('#^uploads/(projects|certificates|designs|profile|resume)/([A-Za-z0-9][A-Za-z0-9._-]{0,180})$#', $path, $matches)) {
        return null;
    }

    $folder = $matches[1];
    $extension = strtolower(pathinfo($matches[2], PATHINFO_EXTENSION));
    $allowed = [
        'projects' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'designs' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'profile' => ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        'certificates' => ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf'],
        'resume' => ['pdf', 'doc', 'docx'],
    ];

    if (!in_array($extension, $allowed[$folder], true)) {
        return null;
    }

    $uploadsRoot = realpath(PUBLIC_PATH . '/uploads');
    $file = realpath(PUBLIC_PATH . '/' . $path);
    if ($uploadsRoot === false || $file === false || !is_file($file)) {
        return null;
    }

    $uploadsRoot = rtrim(str_replace('\\', '/', $uploadsRoot), '/') . '/';
    $file = str_replace('\\', '/', $file);
    if (!str_starts_with(strtolower($file), strtolower($uploadsRoot))) {
        return null;
    }

    return url($path);
}

function excerpt(?string $value, int $limit = 160): string
{
    $text = trim(preg_replace('/\s+/', ' ', (string) $value) ?? '');
    if ($text === '' || mb_strlen($text) <= $limit) {
        return $text;
    }

    return rtrim(mb_substr($text, 0, $limit - 1)) . '…';
}

function text_lines(?string $value): array
{
    $parts = preg_split('/\r\n|\r|\n/', (string) $value) ?: [];
    $lines = [];
    foreach ($parts as $part) {
        $part = trim((string) $part);
        if ($part !== '') {
            $lines[] = $part;
        }
    }

    return $lines;
}

function comma_list(?string $value): array
{
    $parts = preg_split('/\s*,\s*/', (string) $value) ?: [];
    $items = [];
    foreach ($parts as $part) {
        $part = trim((string) $part);
        if ($part !== '') {
            $items[] = $part;
        }
    }

    return $items;
}

function present_profile(?array $profile): array
{
    $profile = $profile ?? [];
    $email = trim((string) ($profile['public_email'] ?? ''));

    return [
        'full_name' => trim((string) ($profile['full_name'] ?? '')),
        'headline' => trim((string) ($profile['headline'] ?? '')),
        'introduction' => trim((string) ($profile['introduction'] ?? '')),
        'biography' => trim((string) ($profile['biography'] ?? '')),
        'location' => trim((string) ($profile['location'] ?? '')),
        'public_email' => filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : '',
        'phone' => safe_phone($profile['phone'] ?? null),
        'linkedin_url' => safe_url($profile['linkedin_url'] ?? null) ?? '',
        'github_url' => safe_url($profile['github_url'] ?? null) ?? '',
        'resume_url' => media_url($profile['resume_path'] ?? null) ?? '',
        'profile_image_url' => media_url($profile['profile_image_path'] ?? null) ?? '',
        'seo_title' => trim((string) ($profile['seo_title'] ?? '')),
        'seo_description' => trim((string) ($profile['seo_description'] ?? '')),
    ];
}

function present_project(array $project): array
{
    $project['live_url'] = safe_url($project['live_url'] ?? null) ?? '';
    $project['repository_url'] = safe_url($project['repository_url'] ?? null) ?? '';
    $project['cover_url'] = media_url($project['cover_image_path'] ?? null) ?? '';
    $project['technology_list'] = comma_list($project['technologies'] ?? null);
    $project['feature_list'] = text_lines($project['features'] ?? null);
    $project['summary'] = trim((string) ($project['summary'] ?? ''));
    $project['description'] = trim((string) ($project['description'] ?? ''));
    $project['overview'] = trim((string) ($project['overview'] ?? ''));
    $project['purpose'] = trim((string) ($project['purpose'] ?? ''));
    $project['role'] = trim((string) ($project['role'] ?? ''));
    $project['contribution'] = trim((string) ($project['contribution'] ?? ''));
    $project['solution'] = trim((string) ($project['solution'] ?? ''));
    $project['lessons'] = trim((string) ($project['lessons'] ?? ''));

    if ($project['purpose'] === '' && $project['description'] !== '') {
        $project['purpose'] = $project['description'];
    }

    if ($project['overview'] === '') {
        $project['overview'] = $project['summary'];
        $project['show_summary'] = false;
    } else {
        $project['show_summary'] = $project['summary'] !== '' && $project['summary'] !== $project['overview'];
    }

    return $project;
}

function present_design(array $item): array
{
    $title = trim((string) ($item['title'] ?? ''));
    $category = trim((string) ($item['category'] ?? ''));
    $item['title'] = $title;
    $item['category'] = $category;
    $item['description'] = trim((string) ($item['description'] ?? ''));
    $item['image_url'] = media_url($item['image_path'] ?? null) ?? '';
    $item['external_url'] = safe_url($item['external_url'] ?? null) ?? '';
    $item['alt'] = $category !== '' ? $title . ', ' . $category : $title;

    return $item;
}

function present_certificate(array $item): array
{
    $fileUrl = media_url($item['file_path'] ?? null) ?? '';
    $extension = $fileUrl !== '' ? strtolower(pathinfo((string) parse_url($fileUrl, PHP_URL_PATH), PATHINFO_EXTENSION)) : '';
    $item['title'] = trim((string) ($item['title'] ?? ''));
    $item['issuing_organization'] = trim((string) ($item['issuing_organization'] ?? ''));
    $item['description'] = trim((string) ($item['description'] ?? ''));
    $item['credential_id'] = trim((string) ($item['credential_id'] ?? ''));
    $item['issued_label'] = format_date($item['issued_on'] ?? null);
    $item['credential_url'] = safe_url($item['credential_url'] ?? null) ?? '';
    $item['file_url'] = $fileUrl;
    $item['file_is_image'] = in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true);
    $displayUrl = media_url($item['display_image_path'] ?? null) ?? '';
    if ($displayUrl === '' && $item['file_is_image']) {
        $displayUrl = $fileUrl;
    }
    $item['display_url'] = $displayUrl;

    return $item;
}

function experience_type_label(string $type): string
{
    return match ($type) {
        'education' => 'Education',
        'placement' => 'Placement',
        'freelance' => 'Independent work',
        'volunteering' => 'Leadership and volunteering',
        'leadership' => 'Leadership',
        'volunteer' => 'Volunteer work',
        'work' => 'Work',
        default => $type,
    };
}

function admin_nav_current(string $path): bool
{
    $current = request_path();
    if ($path === '/admin') {
        return $current === '/admin';
    }

    $path = '/' . trim($path, '/');

    return $current === $path || str_starts_with($current, $path . '/');
}

function client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '');

    return $ip !== '' ? $ip : 'unknown';
}

function login_throttle_blocked(string $ip, int $max = 5, int $windowSeconds = 900): bool
{
    return count(login_throttle_hits($ip, $windowSeconds)) >= $max;
}

function login_throttle_hit(string $ip, int $windowSeconds = 900): void
{
    $hits = login_throttle_hits($ip, $windowSeconds);
    $hits[] = time();
    login_throttle_write($ip, $hits);
}

function login_throttle_clear(string $ip): void
{
    $path = login_throttle_file($ip);
    if (is_file($path)) {
        unlink($path);
    }
}

function login_throttle_hits(string $ip, int $windowSeconds): array
{
    $path = login_throttle_file($ip);
    if (!is_file($path)) {
        return [];
    }

    $decoded = json_decode((string) file_get_contents($path), true);
    if (!is_array($decoded)) {
        return [];
    }

    $now = time();
    $hits = [];
    foreach ($decoded as $hit) {
        if (is_int($hit) && ($now - $hit) < $windowSeconds) {
            $hits[] = $hit;
        }
    }

    return $hits;
}

function login_throttle_write(string $ip, array $hits): void
{
    $directory = STORAGE_PATH . '/cache';
    if (!is_dir($directory)) {
        mkdir($directory, 0755, true);
    }

    file_put_contents(login_throttle_file($ip), json_encode(array_values($hits)), LOCK_EX);
}

function login_throttle_file(string $ip): string
{
    return STORAGE_PATH . '/cache/login-' . hash('sha256', $ip) . '.json';
}

function nav_is_current(string $path): bool
{
    $current = request_path();
    if ($path === '/') {
        return $current === '/';
    }

    $path = '/' . trim($path, '/');

    return $current === $path || str_starts_with($current, $path . '/');
}

function rate_limit_allows(string $bucket, int $max, int $windowSeconds): bool
{
    $now = time();
    $hits = $_SESSION['_rate'][$bucket] ?? [];
    if (!is_array($hits)) {
        $hits = [];
    }

    $recent = [];
    foreach ($hits as $hit) {
        if (is_int($hit) && ($now - $hit) < $windowSeconds) {
            $recent[] = $hit;
        }
    }

    if (count($recent) >= $max) {
        $_SESSION['_rate'][$bucket] = $recent;
        return false;
    }

    $recent[] = $now;
    $_SESSION['_rate'][$bucket] = $recent;

    return true;
}

function paginate(int $total, int $page, int $perPage): array
{
    $perPage = max(1, $perPage);
    $totalPages = max(1, (int) ceil($total / $perPage));
    $page = min(max(1, $page), $totalPages);

    return [
        'total' => max(0, $total),
        'page' => $page,
        'per_page' => $perPage,
        'total_pages' => $totalPages,
        'offset' => ($page - 1) * $perPage,
    ];
}

function slugify(string $value): string
{
    $value = strtolower(trim($value));
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';

    return trim($value, '-');
}

function query_url(string $path, array $query): string
{
    $clean = [];
    foreach ($query as $key => $value) {
        if ($value === null || $value === '') {
            continue;
        }
        $clean[(string) $key] = $value;
    }

    $built = http_build_query($clean);

    return url($path) . ($built !== '' ? '?' . $built : '');
}

function query_string(string $key, int $max = 120): string
{
    $value = $_GET[$key] ?? '';
    if (!is_string($value)) {
        return '';
    }

    return mb_substr(trim($value), 0, $max);
}

function query_choice(string $key, array $allowed): string
{
    $value = query_string($key, 40);

    return in_array($value, $allowed, true) ? $value : '';
}

function query_page(): int
{
    $page = $_GET['page'] ?? 1;
    $page = is_scalar($page) ? (int) $page : 1;

    return max(1, $page);
}

function field(array $control): void
{
    $name = (string) ($control['name'] ?? '');
    $type = (string) ($control['type'] ?? 'text');
    $label = (string) ($control['label'] ?? '');
    $value = (string) ($control['value'] ?? '');
    $error = (string) ($control['error'] ?? '');
    $help = (string) ($control['help'] ?? '');
    $required = !empty($control['required']);
    $options = is_array($control['options'] ?? null) ? $control['options'] : [];
    $accept = (string) ($control['accept'] ?? '');
    $preview = (string) ($control['preview'] ?? '');
    $previewLabel = (string) ($control['preview_label'] ?? 'Current file');
    $checked = !empty($control['checked']);
    $max = (int) ($control['max'] ?? 0);
    require APP_PATH . '/Views/partials/form/control.php';
}

function form_open(string $action, bool $files = false): void
{
    $enctype = $files ? ' enctype="multipart/form-data"' : '';
    echo '<form class="admin-form" method="post" action="' . e(url($action)) . '"' . $enctype . '>';
    echo csrf_field();
}

function form_close(): void
{
    echo '</form>';
}

function status_badge(string $status): void
{
    $label = match ($status) {
        'published' => 'Published',
        'draft' => 'Draft',
        'read' => 'Read',
        'unread' => 'Unread',
        default => $status,
    };
    $class = in_array($status, ['published', 'read'], true) ? 'is-live' : 'is-draft';
    echo '<span class="status-badge ' . e($class) . '">' . e($label) . '</span>';
}

function record_actions(string $base, int $id, string $status): void
{
    $base = '/' . trim($base, '/');
    $next = $status === 'published' ? 'draft' : 'published';
    $label = $next === 'published' ? 'Publish' : 'Unpublish';
    echo '<div class="row-actions">';
    echo '<a href="' . e(url($base . '/' . $id)) . '">View</a>';
    echo '<a href="' . e(url($base . '/' . $id . '/edit')) . '">Edit</a>';
    echo '<form method="post" action="' . e(url($base . '/' . $id . '/status')) . '">';
    echo csrf_field();
    echo '<input type="hidden" name="return" value="' . e($base) . '">';
    echo '<input type="hidden" name="status" value="' . e($next) . '">';
    echo '<button type="submit">' . e($label) . '</button>';
    echo '</form>';
    echo '<a href="' . e(url($base . '/' . $id . '/delete')) . '">Delete</a>';
    echo '</div>';
}

function pager(string $path, array $paging, array $query): void
{
    if ((int) ($paging['total_pages'] ?? 1) < 2) {
        return;
    }

    require APP_PATH . '/Views/partials/admin/pager.php';
}

function release_upload(?string $relative): void
{
    $relative = upload_relative($relative);
    $absolute = upload_absolute($relative);
    if ($relative === null || $absolute === null || upload_is_referenced($relative)) {
        return;
    }

    if (!@unlink($absolute)) {
        app_log('Uploaded file could not be removed: ' . $relative);
    }
}

function upload_relative(?string $path): ?string
{
    $path = str_replace('\\', '/', trim((string) $path));
    if ($path === '' || str_contains($path, '..') || str_contains($path, '://')) {
        return null;
    }

    $path = ltrim($path, '/');
    if (!preg_match('#^uploads/(projects|certificates|designs|profile|resume)/([A-Za-z0-9][A-Za-z0-9._-]{0,180})$#', $path)) {
        return null;
    }

    return $path;
}

function upload_absolute(?string $relative): ?string
{
    $relative = upload_relative($relative);
    if ($relative === null) {
        return null;
    }

    $uploadsRoot = realpath(PUBLIC_PATH . '/uploads');
    $file = realpath(PUBLIC_PATH . '/' . $relative);
    if ($uploadsRoot === false || $file === false || !is_file($file)) {
        return null;
    }

    $uploadsRoot = rtrim(str_replace('\\', '/', $uploadsRoot), '/') . '/';
    $file = str_replace('\\', '/', $file);
    if (!str_starts_with(strtolower($file), strtolower($uploadsRoot))) {
        return null;
    }

    return $file;
}

function upload_is_referenced(string $relative): bool
{
    $checks = [
        ['projects', 'cover_image_path'],
        ['certificates', 'file_path'],
        ['certificates', 'display_image_path'],
        ['design_items', 'image_path'],
        ['profile_settings', 'profile_image_path'],
        ['profile_settings', 'resume_path'],
    ];
    $db = \App\Core\Database::connection();

    foreach ($checks as [$table, $column]) {
        $statement = $db->prepare('SELECT COUNT(*) FROM ' . $table . ' WHERE ' . $column . ' = :path');
        $statement->execute(['path' => $relative]);
        if ((int) $statement->fetchColumn() > 0) {
            return true;
        }
    }

    return false;
}
