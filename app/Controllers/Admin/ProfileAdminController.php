<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Input;
use App\Core\Upload;
use App\Core\Validator;
use App\Models\Profile;
use Throwable;

class ProfileAdminController extends AdminController
{
    public function edit(): void
    {
        $profile = (new Profile())->current();
        $this->profileForm($profile, $this->profileValues($profile), []);
    }

    public function update(): void
    {
        $this->assertCsrf('/admin/profile');
        $current = (new Profile())->current();
        $parsed = $this->parsedProfile($current);
        if ($parsed['validator']->fails()) {
            $this->rejectUpload($parsed, 'profile_image');
            $this->profileForm($current, $parsed['validator']->values(), $parsed['validator']->errors());
            return;
        }

        try {
            (new Profile())->save($parsed['data']);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception, $parsed['new_file']);
            $this->profileForm($current, $parsed['validator']->values(), []);
            return;
        }

        if ($parsed['previous_file'] !== $parsed['data']['profile_image_path']) {
            release_upload($parsed['previous_file']);
        }

        flash('success', 'Profile saved.');
        redirect('/admin/profile');
    }

    public function media(): void
    {
        $profile = (new Profile())->current();
        $this->admin('admin/media/form', [
            'title' => 'Resume and profile image | Administration',
            'nav' => '/admin/media',
            'heading' => 'Resume and profile image',
            'lede' => 'The public site links to a resume only after a PDF is saved here.',
            'resumeUrl' => media_url($profile['resume_path'] ?? null) ?? '',
            'imageUrl' => media_url($profile['profile_image_path'] ?? null) ?? '',
            'errors' => [],
        ]);
    }

    public function updateResume(): void
    {
        $this->assertCsrf('/admin/media');
        $profile = (new Profile())->current();
        if ($profile === null) {
            flash('error', 'Save the profile before uploading a resume.');
            redirect('/admin/profile');
        }

        $upload = Upload::take('resume_file', 'resume', ['pdf']);
        $errors = [];
        if ($upload['error'] !== null) {
            $errors['resume_file'] = $upload['error'];
        }

        $previous = is_string($profile['resume_path'] ?? null) && $profile['resume_path'] !== '' ? $profile['resume_path'] : null;
        $remove = Input::checked('remove_resume');
        $path = $remove ? null : $previous;
        if ($upload['path'] !== null) {
            $path = $upload['path'];
        }

        if ($upload['path'] === null && !$remove && $errors === []) {
            $errors['resume_file'] = $previous === null
                ? 'Choose a PDF resume to upload.'
                : 'Choose a PDF to replace the current resume, or remove it.';
        }

        if ($errors !== []) {
            release_upload($upload['path']);
            $this->admin('admin/media/form', [
                'title' => 'Resume and profile image | Administration',
                'nav' => '/admin/media',
                'heading' => 'Resume and profile image',
                'lede' => 'The public site links to a resume only after a PDF is saved here.',
                'resumeUrl' => media_url($previous) ?? '',
                'imageUrl' => media_url($profile['profile_image_path'] ?? null) ?? '',
                'errors' => $errors,
                'removeResume' => $remove,
            ]);
            return;
        }

        $data = $this->storedProfile($profile);
        $data['resume_path'] = $path;

        try {
            (new Profile())->save($data);
        } catch (Throwable $exception) {
            $this->couldNotSave($exception, $upload['path']);
            redirect('/admin/media');
        }

        if ($previous !== $path) {
            release_upload($previous);
        }

        flash('success', $path === null ? 'Resume removed.' : 'Resume saved.');
        redirect('/admin/media');
    }

    private function profileForm(?array $profile, array $values, array $errors): void
    {
        $this->admin('admin/profile/form', [
            'title' => 'Profile and social links | Administration',
            'nav' => '/admin/profile',
            'heading' => 'Profile and social links',
            'lede' => 'Empty email, phone, and social links stay off the public site.',
            'values' => $values,
            'errors' => $errors,
            'preview' => media_url($profile['profile_image_path'] ?? null) ?? '',
        ]);
    }

    private function parsedProfile(?array $current): array
    {
        $v = new Validator();
        $name = $v->string('full_name', 'Name', 120, true);
        $headline = $v->string('headline', 'Headline', 180, true);
        $introduction = $v->string('introduction', 'Introduction', 5000, true);
        $biography = $v->string('biography', 'Biography', 20000);
        $location = $v->string('location', 'Location', 160);
        $email = $v->optionalEmail('public_email', 'Email');
        $phone = $v->optionalPhone('phone');
        $linkedin = $v->optionalUrl('linkedin_url', 'LinkedIn URL');
        $github = $v->optionalUrl('github_url', 'GitHub URL');
        $seoTitle = $v->string('seo_title', 'SEO title', 160);
        $seoDescription = $v->string('seo_description', 'SEO description', 320);
        $upload = Upload::take('profile_image', 'profile', ['jpg', 'jpeg', 'png', 'gif', 'webp']);
        if ($upload['error'] !== null) {
            $v->add('profile_image', $upload['error']);
        }

        $previous = is_string($current['profile_image_path'] ?? null) && $current['profile_image_path'] !== ''
            ? $current['profile_image_path']
            : null;
        $path = $v->flag('remove_image') === 1 ? null : $previous;
        if ($upload['path'] !== null) {
            $path = $upload['path'];
        }

        $resume = is_string($current['resume_path'] ?? null) && $current['resume_path'] !== '' ? $current['resume_path'] : null;

        return [
            'validator' => $v,
            'new_file' => $upload['path'],
            'previous_file' => $previous,
            'data' => [
                'full_name' => $name,
                'headline' => $headline,
                'introduction' => $introduction,
                'biography' => $biography === '' ? null : $biography,
                'location' => $location === '' ? null : $location,
                'public_email' => $email,
                'phone' => $phone,
                'linkedin_url' => $linkedin,
                'github_url' => $github,
                'resume_path' => $resume,
                'profile_image_path' => $path,
                'seo_title' => $seoTitle === '' ? null : $seoTitle,
                'seo_description' => $seoDescription === '' ? null : $seoDescription,
            ],
        ];
    }

    private function rejectUpload(array $parsed, string $key): void
    {
        if ($parsed['new_file'] !== null && !isset($parsed['validator']->errors()[$key])) {
            $parsed['validator']->add($key, 'Choose the image again after fixing the other fields.');
        }
        release_upload($parsed['new_file']);
    }

    private function profileValues(?array $profile): array
    {
        $profile = $profile ?? [];

        return [
            'full_name' => (string) ($profile['full_name'] ?? ''),
            'headline' => (string) ($profile['headline'] ?? ''),
            'introduction' => (string) ($profile['introduction'] ?? ''),
            'biography' => (string) ($profile['biography'] ?? ''),
            'location' => (string) ($profile['location'] ?? ''),
            'public_email' => (string) ($profile['public_email'] ?? ''),
            'phone' => (string) ($profile['phone'] ?? ''),
            'linkedin_url' => (string) ($profile['linkedin_url'] ?? ''),
            'github_url' => (string) ($profile['github_url'] ?? ''),
            'seo_title' => (string) ($profile['seo_title'] ?? ''),
            'seo_description' => (string) ($profile['seo_description'] ?? ''),
        ];
    }

    private function storedProfile(array $profile): array
    {
        return [
            'full_name' => (string) $profile['full_name'],
            'headline' => (string) $profile['headline'],
            'introduction' => (string) $profile['introduction'],
            'biography' => $profile['biography'] !== null && $profile['biography'] !== '' ? (string) $profile['biography'] : null,
            'location' => $profile['location'] !== null && $profile['location'] !== '' ? (string) $profile['location'] : null,
            'public_email' => $profile['public_email'] !== null && $profile['public_email'] !== '' ? (string) $profile['public_email'] : null,
            'phone' => $profile['phone'] !== null && $profile['phone'] !== '' ? (string) $profile['phone'] : null,
            'linkedin_url' => $profile['linkedin_url'] !== null && $profile['linkedin_url'] !== '' ? (string) $profile['linkedin_url'] : null,
            'github_url' => $profile['github_url'] !== null && $profile['github_url'] !== '' ? (string) $profile['github_url'] : null,
            'resume_path' => $profile['resume_path'] !== null && $profile['resume_path'] !== '' ? (string) $profile['resume_path'] : null,
            'profile_image_path' => $profile['profile_image_path'] !== null && $profile['profile_image_path'] !== '' ? (string) $profile['profile_image_path'] : null,
            'seo_title' => $profile['seo_title'] !== null && $profile['seo_title'] !== '' ? (string) $profile['seo_title'] : null,
            'seo_description' => $profile['seo_description'] !== null && $profile['seo_description'] !== '' ? (string) $profile['seo_description'] : null,
        ];
    }
}
