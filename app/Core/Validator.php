<?php

declare(strict_types=1);

namespace App\Core;

use DateTimeImmutable;

final class Validator
{
    /** @var array<string, string> */
    private array $errors = [];

    /** @var array<string, string|int> */
    private array $values = [];

    public function errors(): array
    {
        return $this->errors;
    }

    public function values(): array
    {
        return $this->values;
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    public function add(string $key, string $message): void
    {
        if (!isset($this->errors[$key])) {
            $this->errors[$key] = $message;
        }
    }

    public function set(string $key, string|int $value): void
    {
        $this->values[$key] = $value;
    }

    public function string(string $key, string $label, int $max, bool $required = false): string
    {
        $value = Input::text($key);
        $this->values[$key] = $value;

        if ($value === '') {
            if ($required) {
                $this->add($key, $label . ' is required.');
            }

            return '';
        }

        if (mb_strlen($value) > $max) {
            $this->add($key, $label . ' must be ' . $max . ' characters or fewer.');
        }

        return $value;
    }

    public function slug(string $key, string $sourceKey): string
    {
        $raw = Input::text($key);
        $slug = slugify($raw !== '' ? $raw : Input::text($sourceKey));
        $this->values[$key] = $slug;

        if ($slug === '' || !preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug)) {
            $this->add($key, 'Use a slug made of lowercase letters, numbers, and hyphens.');
        } elseif (strlen($slug) > 180) {
            $this->add($key, 'Slug must be 180 characters or fewer.');
        }

        return $slug;
    }

    public function optionalUrl(string $key, string $label): ?string
    {
        $value = Input::text($key);
        $this->values[$key] = $value;
        if ($value === '') {
            return null;
        }

        $url = safe_url($value);
        if ($url === null) {
            $this->add($key, $label . ' must be a full http or https address.');
            return null;
        }

        return $url;
    }

    public function optionalEmail(string $key, string $label): ?string
    {
        $value = Input::text($key);
        $this->values[$key] = $value;
        if ($value === '') {
            return null;
        }

        if (strlen($value) > 190 || filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $this->add($key, $label . ' must be a valid email address.');
            return null;
        }

        return $value;
    }

    public function optionalPhone(string $key): ?string
    {
        $value = Input::text($key);
        $this->values[$key] = $value;
        if ($value === '') {
            return null;
        }

        $phone = safe_phone($value);
        if ($phone === '') {
            $this->add($key, 'Enter a phone number using digits and normal separators, or leave it blank.');
            return null;
        }

        return $phone;
    }

    public function optionalDate(string $key, string $label): ?string
    {
        $value = Input::text($key);
        $this->values[$key] = $value;
        if ($value === '') {
            return null;
        }

        $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
        $problems = DateTimeImmutable::getLastErrors();
        $invalid = is_array($problems) && (((int) ($problems['warning_count'] ?? 0)) > 0 || ((int) ($problems['error_count'] ?? 0)) > 0);
        if ($date === false || $invalid || $date->format('Y-m-d') !== $value) {
            $this->add($key, $label . ' must be a real date.');
            return null;
        }

        return $value;
    }

    /**
     * @param array<int, string> $allowed
     */
    public function choice(string $key, string $label, array $allowed, string $fallback = ''): string
    {
        $value = Input::text($key);
        if ($value === '' && $fallback !== '') {
            $value = $fallback;
        }
        $this->values[$key] = $value;

        if (!in_array($value, $allowed, true)) {
            $this->add($key, 'Choose a valid ' . strtolower($label) . '.');
            return $fallback;
        }

        return $value;
    }

    public function flag(string $key): int
    {
        $value = Input::checked($key) ? 1 : 0;
        $this->values[$key] = $value;

        return $value;
    }

    public function order(string $key = 'display_order'): int
    {
        $raw = Input::text($key);
        $this->values[$key] = $raw === '' ? '0' : $raw;
        if ($raw === '') {
            return 0;
        }

        if (!preg_match('/^-?[0-9]{1,6}$/', $raw)) {
            $this->add($key, 'Display order must be a whole number.');
            return 0;
        }

        $number = (int) $raw;
        if ($number < -1000 || $number > 10000) {
            $this->add($key, 'Display order must be between -1000 and 10000.');
        }

        return $number;
    }
}
