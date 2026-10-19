<?php

declare(strict_types=1);

namespace App\Core;

final class Upload
{
    private const MIME = [
        'jpg' => ['image/jpeg'],
        'jpeg' => ['image/jpeg'],
        'png' => ['image/png'],
        'gif' => ['image/gif'],
        'webp' => ['image/webp'],
        'pdf' => ['application/pdf'],
    ];

    /**
     * Store one uploaded file under public/uploads/{folder}.
     * No file returns a null path and a null error.
     *
     * @param array<int, string> $extensions
     * @return array{path: ?string, error: ?string}
     */
    public static function take(string $field, string $folder, array $extensions): array
    {
        if (!isset($_FILES[$field]) || !is_array($_FILES[$field])) {
            return ['path' => null, 'error' => null];
        }

        $file = $_FILES[$field];
        $error = (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($error === UPLOAD_ERR_NO_FILE) {
            return ['path' => null, 'error' => null];
        }

        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            return ['path' => null, 'error' => 'The file is larger than the server allows.'];
        }

        if ($error !== UPLOAD_ERR_OK) {
            return ['path' => null, 'error' => 'The file could not be uploaded.'];
        }

        $temporary = (string) ($file['tmp_name'] ?? '');
        if ($temporary === '' || !is_uploaded_file($temporary)) {
            return ['path' => null, 'error' => 'The file could not be uploaded.'];
        }

        $size = (int) ($file['size'] ?? 0);
        $max = self::maxBytes($extensions);
        if ($size < 1 || $size > $max) {
            return ['path' => null, 'error' => 'The file must be ' . (int) ($max / 1024 / 1024) . ' MB or smaller.'];
        }

        $original = (string) ($file['name'] ?? '');
        if ($original === '' || str_contains($original, "\0")) {
            return ['path' => null, 'error' => 'That file type is not allowed.'];
        }

        $extension = strtolower(pathinfo($original, PATHINFO_EXTENSION));
        if (!in_array($extension, $extensions, true) || !isset(self::MIME[$extension])) {
            return ['path' => null, 'error' => 'That file type is not allowed.'];
        }

        $detected = (new \finfo(FILEINFO_MIME_TYPE))->file($temporary);
        if (!is_string($detected) || !in_array(strtolower($detected), self::MIME[$extension], true)) {
            return ['path' => null, 'error' => 'The file contents do not match an allowed type.'];
        }

        if (!in_array($folder, ['projects', 'certificates', 'designs', 'profile', 'resume'], true)) {
            return ['path' => null, 'error' => 'The file could not be stored.'];
        }

        $directory = ROOT_PATH . '/public/uploads/' . $folder;
        if (!is_dir($directory) && !mkdir($directory, 0755, true) && !is_dir($directory)) {
            return ['path' => null, 'error' => 'The file could not be stored.'];
        }

        $filename = bin2hex(random_bytes(16)) . '.' . $extension;
        $destination = $directory . '/' . $filename;
        if (!move_uploaded_file($temporary, $destination)) {
            return ['path' => null, 'error' => 'The file could not be stored.'];
        }

        return ['path' => 'uploads/' . $folder . '/' . $filename, 'error' => null];
    }

    /**
     * @param array<int, string> $extensions
     */
    private static function maxBytes(array $extensions): int
    {
        return in_array('pdf', $extensions, true) ? 8 * 1024 * 1024 : 5 * 1024 * 1024;
    }
}
