<?php

declare(strict_types=1);

namespace App\Core;

final class Catalog
{
    public static function skillCategories(): array
    {
        return [
            'Programming Languages',
            'Programming',
            'Frameworks and Libraries',
            'Frameworks',
            'Databases',
            'Tools and Platforms',
            'Tools',
            'IT Support',
            'Systems Analysis',
            'Design',
            'Other Skills',
        ];
    }

    public static function experienceTypes(): array
    {
        return [
            'work' => 'Work',
            'placement' => 'Placement',
            'freelance' => 'Independent work',
            'leadership' => 'Leadership',
            'volunteering' => 'Leadership and volunteering',
            'volunteer' => 'Volunteer work',
            'education' => 'Education',
        ];
    }

    public static function statuses(): array
    {
        return [
            'draft' => 'Draft',
            'published' => 'Published',
        ];
    }
}
