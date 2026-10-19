<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Models\ContactMessage;
use PDOException;

class ContactController extends PublicController
{
    public function show(): void
    {
        $this->form();
    }

    public function submit(): void
    {
        if (!csrf_validate(isset($_POST['_csrf']) ? (string) $_POST['_csrf'] : null)) {
            flash('error', 'The form expired. Submit it again.');
            redirect('/contact');
        }

        if (!rate_limit_allows('contact-attempt', 20, 15 * 60)) {
            flash('error', 'Please wait a few minutes before sending another message.');
            redirect('/contact');
        }

        $honeypot = trim((string) ($_POST['website'] ?? ''));
        if ($honeypot !== '') {
            flash('error', 'The form could not be submitted.');
            redirect('/contact');
        }

        $name = trim((string) ($_POST['name'] ?? ''));
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $subject = trim((string) ($_POST['subject'] ?? ''));
        $message = trim((string) ($_POST['message'] ?? ''));
        $message = preg_replace("/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]/", '', $message) ?? '';

        $errors = $this->validate($name, $email, $subject, $message);
        if ($errors !== []) {
            $this->form($errors, compact('name', 'email', 'subject', 'message'));
            return;
        }

        if (!rate_limit_allows('contact-save', 3, 15 * 60)) {
            flash('error', 'Please wait a few minutes before sending another message.');
            redirect('/contact');
        }

        $messages = new ContactMessage();
        $since = date('Y-m-d H:i:s', time() - 3600);
        if ($messages->countRecentByEmail($email, $since) >= 5) {
            flash('error', 'Please wait a few minutes before sending another message.');
            redirect('/contact');
        }

        try {
            $messages->create($name, $email, $subject, $message);
        } catch (PDOException $exception) {
            app_log('Contact message was not saved: ' . $exception->getMessage());
            flash('error', 'The message could not be saved.');
            redirect('/contact');
        }

        flash('success', 'Your message has been saved. It is not sent by email.');
        redirect('/contact');
    }

    private function form(array $errors = [], array $old = []): void
    {
        $siteName = $this->siteName();

        $this->page('public/contact', [
            'title' => $this->titled('Contact', $siteName),
            'metaDescription' => 'Contact ' . $siteName . '. Messages are saved on this site and are not sent by email.',
            'canonicalPath' => '/contact',
            'errors' => $errors,
            'old' => $old,
        ]);
    }

    private function validate(string $name, string $email, string $subject, string $message): array
    {
        $errors = [];

        if ($name === '' || mb_strlen($name) < 2 || mb_strlen($name) > 120) {
            $errors['name'] = 'Enter your name, using 2 to 120 characters.';
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
            $errors['email'] = 'Enter a valid email address.';
        }

        if ($subject === '' || mb_strlen($subject) < 3 || mb_strlen($subject) > 180) {
            $errors['subject'] = 'Enter a subject, using 3 to 180 characters.';
        }

        if ($message === '' || mb_strlen($message) < 10 || mb_strlen($message) > 5000) {
            $errors['message'] = 'Enter a message, using 10 to 5000 characters.';
        }

        return $errors;
    }
}
