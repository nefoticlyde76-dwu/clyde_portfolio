<?php

declare(strict_types=1);

namespace App\Core;

final class Input
{
    public static function text(string $key): string
    {
        $value = $_POST[$key] ?? '';
        if (!is_string($value)) {
            return '';
        }

        return trim(str_replace("\0", '', $value));
    }

    public static function checked(string $key): bool
    {
        return isset($_POST[$key]) && (string) $_POST[$key] === '1';
    }
}
