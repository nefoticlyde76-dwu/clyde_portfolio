<?php

declare(strict_types=1);

/**
 * Inserts the CV-backed portfolio content once.
 * Run: C:\xampp\php\php.exe scripts\seed_content.php
 *
 * Existing rows are left unchanged, including anything edited in the dashboard.
 * Original seeded rows are aligned only while they still match their known
 * starting text.
 * Certificates and NCRA are not created.
 */

use App\Core\Database;

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require dirname(__DIR__) . '/app/Core/bootstrap.php';

$pdo = Database::connection();
$inserted = 0;
$skipped = 0;
$aligned = 0;

$pdo->beginTransaction();

try {
    [$inserted, $skipped, $aligned] = seed_content($pdo, $inserted, $skipped, $aligned);
    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    fwrite(STDERR, "The content could not be saved.\n");
    app_log($exception->getMessage());
    exit(1);
}

fwrite(STDOUT, "Inserted {$inserted}. Already present {$skipped}. Original rows aligned {$aligned}.\n");
fwrite(STDOUT, "Certificates were not added. NCRA was not added.\n");
exit(0);

function seed_content(PDO $pdo, int $inserted, int $skipped, int $aligned): array
{
    if (seed_exists($pdo, 'SELECT id FROM profile_settings WHERE id = 1')) {
        $skipped++;
        $aligned += seed_align_profile($pdo);
        $aligned += seed_align_profile_headline($pdo);
    } else {
        seed_execute($pdo, 'INSERT INTO profile_settings (
            id, full_name, headline, introduction, biography, location,
            public_email, phone, linkedin_url, github_url, resume_path, profile_image_path,
            seo_title, seo_description
        ) VALUES (
            1, :full_name, :headline, :introduction, :biography, :location,
            NULL, NULL, NULL, NULL, NULL, NULL,
            :seo_title, :seo_description
        )', seed_profile());
        $inserted++;
    }

    foreach (seed_projects() as $project) {
        if (seed_exists($pdo, 'SELECT id FROM projects WHERE slug = :slug', ['slug' => $project['slug']])) {
            $skipped++;
            continue;
        }
        seed_execute($pdo, 'INSERT INTO projects (
            title, slug, category, summary, overview, purpose, role, contribution, solution,
            description, technologies, features, lessons, live_url, repository_url, cover_image_path,
            is_featured, status, display_order
        ) VALUES (
            :title, :slug, :category, :summary, :overview, :purpose, :role, :contribution, :solution,
            :description, :technologies, :features, :lessons, :live_url, :repository_url, NULL,
            :is_featured, :status, :display_order
        )', $project);
        $inserted++;
    }
    $aligned += seed_align_projects($pdo);

    foreach (seed_skills() as $skill) {
        if (seed_exists($pdo, 'SELECT id FROM skills WHERE category = :category AND name = :name', [
            'category' => $skill['category'],
            'name' => $skill['name'],
        ])) {
            $skipped++;
            continue;
        }
        seed_execute($pdo, 'INSERT INTO skills (name, category, display_order, status)
            VALUES (:name, :category, :display_order, :status)', $skill);
        $inserted++;
    }

    foreach (seed_experiences() as $experience) {
        if (seed_exists($pdo, 'SELECT id FROM experiences WHERE title = :title AND organization = :organization', [
            'title' => $experience['title'],
            'organization' => $experience['organization'],
        ])) {
            $skipped++;
            continue;
        }
        seed_execute($pdo, 'INSERT INTO experiences (
            title, organization, period_label, started_on, ended_on, is_current,
            description, experience_type, status, display_order
        ) VALUES (
            :title, :organization, :period_label, :started_on, :ended_on, :is_current,
            :description, :experience_type, :status, :display_order
        )', $experience);
        $inserted++;
    }
    $aligned += seed_align_experiences($pdo);

    foreach (seed_designs() as $design) {
        if (seed_exists($pdo, 'SELECT id FROM design_items WHERE title = :title', ['title' => $design['title']])) {
            $skipped++;
            continue;
        }
        seed_execute($pdo, 'INSERT INTO design_items (
            title, category, description, image_path, external_url, is_featured, status, display_order
        ) VALUES (
            :title, :category, :description, NULL, NULL, 0, :status, :display_order
        )', [
            'title' => $design['title'],
            'category' => $design['category'],
            'description' => $design['description'],
            'status' => $design['status'],
            'display_order' => $design['display_order'],
        ]);
        $inserted++;
    }
    $aligned += seed_align_designs($pdo);
    $aligned += seed_archive_unlisted_content($pdo);

    return [$inserted, $skipped, $aligned];
}

function seed_profile(): array
{
    return [
        'full_name' => 'Clyde Nefoti',
        'headline' => 'CLYDE NEFOTI',
        'introduction' => 'Final year Bachelor of Information Systems student at Divine Word University who designed, built and deployed a live web based teleconsultation system for the Milne Bay Provincial Health Authority using PHP, MySQL and JavaScript. Skilled in systems analysis and design, database design and front end development, with additional experience in graphic design and in leading a student association communication team. Seeking a graduate role in web and systems development or IT support.',
        'biography' => seed_biography(),
        'location' => 'Madang, Papua New Guinea',
        'seo_title' => 'Clyde Nefoti | Information Systems Student and Web Developer',
        'seo_description' => 'Final year Bachelor of Information Systems student at Divine Word University in Madang, Papua New Guinea. Web and systems development, IT support, and graphic design.',
    ];
}

function seed_biography(): string
{
    return 'Clyde Nefoti is a final year Bachelor of Information Systems student at Divine Word University in Madang, Papua New Guinea. He designed, built and deployed a live web based teleconsultation system for the Milne Bay Provincial Health Authority. His interests include web development, graphic design, cloud computing and digital infrastructure in Papua New Guinea.';
}

function seed_projects(): array
{
    return [
        [
            'title' => 'TeleHealth PNG',
            'slug' => 'telehealth-png',
            'category' => 'Final Year Capstone',
            'summary' => 'A live teleconsultation booking and management system designed and built for the Milne Bay Provincial Health Authority as a 2026 capstone project.',
            'overview' => 'Designed, built and deployed a web based teleconsultation booking and management system for the Milne Bay Provincial Health Authority.',
            'purpose' => 'Final Year Capstone Project, 2026.',
            'role' => 'Designer and developer',
            'contribution' => 'Implemented role based authentication for patients, doctors and administrators; doctor availability scheduling; an admin approved booking workflow; browser based video consultations; and digital prescriptions with PDF export. Produced eight formal analysis and design documents and planned delivery across ten Agile sprints.',
            'solution' => 'Deployed the system live on DigitalOcean and managed the codebase with Git and GitHub.',
            'description' => 'Designed, built and deployed a web based teleconsultation booking and management system for the Milne Bay Provincial Health Authority.',
            'technologies' => 'PHP 8 (MVC), MySQL, Bootstrap 5, JavaScript, Git and GitHub, DigitalOcean',
            'features' => "Role based authentication for patients, doctors, and administrators\nDoctor availability scheduling\nAdmin approved booking workflow\nBrowser based video consultations\nDigital prescriptions with PDF export\nEight formal analysis and design documents\nDelivery planned across ten Agile sprints",
            'lessons' => null,
            'live_url' => 'https://mbphatelehealth.com',
            'repository_url' => null,
            'is_featured' => 1,
            'status' => 'published',
            'display_order' => 1,
        ],
    ];
}

function seed_skills(): array
{
    $rows = [
        ['PHP (procedural and MVC)', 'Web and Databases'],
        ['JavaScript', 'Web and Databases'],
        ['HTML5', 'Web and Databases'],
        ['CSS3', 'Web and Databases'],
        ['Bootstrap 5', 'Web and Databases'],
        ['MySQL', 'Web and Databases'],
        ['Database design', 'Web and Databases'],
        ['Git and GitHub', 'Tools and Platforms'],
        ['XAMPP', 'Tools and Platforms'],
        ['Composer', 'Tools and Platforms'],
        ['DigitalOcean', 'Tools and Platforms'],
        ['Active Directory', 'Tools and Platforms'],
        ['Requirements gathering', 'Systems Analysis'],
        ['Business rules', 'Systems Analysis'],
        ['Process flows', 'Systems Analysis'],
        ['Wireframing', 'Systems Analysis'],
        ['Agile planning', 'Systems Analysis'],
        ['React', 'Coursework Exposure'],
        ['TypeScript', 'Coursework Exposure'],
        ['Node.js and Express', 'Coursework Exposure'],
        ['PostgreSQL', 'Coursework Exposure'],
        ['Docker', 'Coursework Exposure'],
        ['Logo and brand identity', 'Design'],
        ['Posters, banners, and flyers', 'Design'],
        ['Technical documentation', 'Professional'],
        ['Troubleshooting and end user support', 'Professional'],
        ['Teamwork and communication', 'Professional'],
    ];
    $skills = [];
    foreach ($rows as $index => [$name, $category]) {
        $skills[] = [
            'name' => $name,
            'category' => $category,
            'display_order' => $index + 1,
            'status' => 'published',
        ];
    }

    return $skills;
}

function seed_experiences(): array
{
    return [
        [
            'title' => 'Graphic Designer',
            'organization' => 'Independent, Papua New Guinea',
            'period_label' => 'Ongoing',
            'started_on' => null,
            'ended_on' => null,
            'is_current' => 1,
            'description' => 'Design logos, posters, banners, flyers, polo shirts and formal wear. Created the brand identity for Lodestar Studio, a design studio concept for Papua New Guinean small businesses. Entered a logo design contest for an eco-friendly tableware brand.',
            'experience_type' => 'freelance',
            'status' => 'published',
            'display_order' => 1,
        ],
        [
            'title' => 'Communication Department Leader',
            'organization' => 'Divine Word Adventist Students Association, Divine Word University',
            'period_label' => '2025',
            'started_on' => null,
            'ended_on' => null,
            'is_current' => 0,
            'description' => 'Led the Communication Department that keeps the Association informed about spiritual and social activities after joining in 2024 and being nominated as leader for 2025. Designed flyers and banners to promote Association events, set up and operated the PA system for worship programs, and mentored the incoming 2026 department leaders to support a smooth handover.',
            'experience_type' => 'volunteering',
            'status' => 'published',
            'display_order' => 2,
        ],
        [
            'title' => 'Bachelor of Information Systems',
            'organization' => 'Divine Word University, Madang, PNG',
            'period_label' => '2023 to 2026 (expected)',
            'started_on' => null,
            'ended_on' => null,
            'is_current' => 1,
            'description' => 'Relevant coursework: Systems Analysis and Design, Advanced Network Management, Data Communications and Cybersecurity, End User Support, and Final Year Capstone Project.',
            'experience_type' => 'education',
            'status' => 'published',
            'display_order' => 3,
        ],
    ];
}

function seed_designs(): array
{
    return [
        [
            'title' => 'Lodestar Studio brand identity',
            'category' => 'Branding',
            'description' => 'Created the brand identity for Lodestar Studio, a design studio concept for Papua New Guinean small businesses.',
            'status' => 'draft',
            'display_order' => 1,
        ],
        [
            'title' => 'Eco-friendly tableware logo contest entry',
            'category' => 'Logo',
            'description' => 'Entered a logo design contest for an eco-friendly tableware brand.',
            'status' => 'draft',
            'display_order' => 2,
        ],
    ];
}

function seed_align_profile(PDO $pdo): int
{
    $profile = seed_profile();
    $statement = $pdo->prepare('UPDATE profile_settings
        SET headline = :headline,
            introduction = :introduction,
            biography = :biography,
            seo_title = :seo_title,
            seo_description = :seo_description
        WHERE id = 1
          AND headline = :original_headline
          AND introduction = :original_introduction
          AND biography = :original_biography
          AND seo_title = :original_seo_title
          AND seo_description = :original_seo_description');
    $statement->execute([
        'headline' => $profile['headline'],
        'introduction' => $profile['introduction'],
        'biography' => $profile['biography'],
        'seo_title' => $profile['seo_title'],
        'seo_description' => $profile['seo_description'],
        'original_headline' => 'Final Year Bachelor of Information Systems Student | Web and Systems Developer | IT Support',
        'original_introduction' => 'Final year Bachelor of Information Systems student at Divine Word University who designed, built and deployed a live web based teleconsultation system for the Milne Bay Provincial Health Authority using PHP, MySQL and JavaScript. Skilled in systems analysis and design, database design and front end development, with additional experience in graphic design and in leading a student association communication team. Seeking a graduate role in web and systems development or IT support.',
        'original_biography' => 'Clyde Nefoti is a final year Bachelor of Information Systems student at Divine Word University in Madang, Papua New Guinea. He is from Milne Bay and Enga Provinces and is a Seventh-day Adventist. His studies and project work cover full stack web development, IT support, systems documentation, and independent graphic design.',
        'original_seo_title' => 'Clyde Nefoti | Information Systems Student, Web Developer',
        'original_seo_description' => 'Final year Bachelor of Information Systems student at Divine Word University in Madang, Papua New Guinea. Web and systems development, IT support, and graphic design.',
    ]);
    $updated = $statement->rowCount();

    $legacyBiography = $pdo->prepare('UPDATE profile_settings
        SET biography = :biography
        WHERE id = 1
          AND biography = :original');
    $legacyBiography->execute([
        'biography' => $profile['biography'],
        'original' => 'Clyde Nefoti is a final year Bachelor of Information Systems student at Divine Word University in Madang, Papua New Guinea. He is from Milne Bay and Enga Provinces and is a Seventh-day Adventist. His studies and project work cover full stack web development, IT support, systems documentation, and independent graphic design.',
    ]);
    $updated += $legacyBiography->rowCount();

    $previousProfile = $pdo->prepare('UPDATE profile_settings
        SET headline = :headline,
            introduction = :introduction,
            biography = :biography,
            seo_title = :seo_title,
            seo_description = :seo_description
        WHERE id = 1
          AND headline = :previous_headline
          AND introduction = :previous_introduction
          AND biography = :previous_biography
          AND seo_title = :previous_seo_title
          AND seo_description = :previous_seo_description');
    $previousProfile->execute([
        'headline' => $profile['headline'],
        'introduction' => $profile['introduction'],
        'biography' => $profile['biography'],
        'seo_title' => $profile['seo_title'],
        'seo_description' => $profile['seo_description'],
        'previous_headline' => 'Web & Systems Developer and IT Support',
        'previous_introduction' => 'Final year Information Systems student with strong skills in full stack web development, IT support and system troubleshooting. Built and deployed a live teleconsultation system for the Milne Bay Provincial Health Authority as a final year capstone. Experienced in working with databases, documenting systems and collaborating in team projects.',
        'previous_biography' => 'Clyde Nefoti is a final year Bachelor of Information Systems student at Divine Word University in Madang, Papua New Guinea. He is from Milne Bay and Enga Provinces and is a Seventh-day Adventist. His work covers web and systems development, IT support, troubleshooting, and graphic design. Professional interests include web development, graphic design, technology and innovation, and worship and church ministry.',
        'previous_seo_title' => 'Clyde Nefoti | Web and Systems Developer',
        'previous_seo_description' => 'Final year Information Systems student in Madang, Papua New Guinea, working in web development, IT support, and graphic design.',
    ]);

    return $updated + $previousProfile->rowCount();
}

function seed_align_profile_headline(PDO $pdo): int
{
    $profile = seed_profile();
    $statement = $pdo->prepare('UPDATE profile_settings
        SET headline = :headline
        WHERE id = 1
          AND headline = :original_headline
          AND introduction = :introduction
          AND biography = :biography');
    $statement->execute([
        'headline' => $profile['headline'],
        'original_headline' => 'Final Year Bachelor of Information Systems Student | Web and Systems Developer | IT Support',
        'introduction' => $profile['introduction'],
        'biography' => seed_biography(),
    ]);

    return $statement->rowCount();
}

function seed_align_projects(PDO $pdo): int
{
    $count = 0;
    $originals = [
        'telehealth-png' => 'A teleconsultation booking and management system for the Milne Bay Provincial Health Authority.',
    ];
    foreach (seed_projects() as $project) {
        $statement = $pdo->prepare('UPDATE projects SET
            summary = :summary,
            overview = :overview,
            purpose = :purpose,
            contribution = :contribution,
            solution = :solution,
            description = :description,
            features = :features
            WHERE slug = :slug
              AND overview IS NULL
              AND summary = :original_summary');
        $statement->execute([
            'summary' => $project['summary'],
            'overview' => $project['overview'],
            'purpose' => $project['purpose'],
            'contribution' => $project['contribution'],
            'solution' => $project['solution'],
            'description' => $project['description'],
            'features' => $project['features'],
            'slug' => $project['slug'],
            'original_summary' => $originals[$project['slug']],
        ]);
        if ($statement->rowCount() > 0) {
            $count++;
        }
    }

    return $count;
}

function seed_align_experiences(PDO $pdo): int
{
    $count = 0;
    $design = $pdo->prepare('UPDATE experiences
        SET description = :description
        WHERE title = :title
          AND organization = :organization
          AND description = :original');
    $design->execute([
        'description' => 'Design logos, posters, banners, flyers, polo shirts and formal wear. Created the brand identity for Lodestar Studio, a design studio concept for Papua New Guinean small businesses. Entered a logo design contest for an eco-friendly tableware brand.',
        'title' => 'Graphic Designer',
        'organization' => 'Independent, Papua New Guinea',
        'original' => 'Designs logos, posters, banners, flyers, polo shirts and formal wear. Created the brand identity for Lodestar Studio, a design studio concept for PNG small businesses. Entered a logo design contest for an eco-friendly tableware brand.',
    ]);
    if ($design->rowCount() > 0) {
        $count++;
    }

    return $count;
}

function seed_archive_unlisted_content(PDO $pdo): int
{
    $project = $pdo->prepare('UPDATE projects
        SET status = \'draft\'
        WHERE slug = :slug
          AND title = :title
          AND (summary = :summary OR summary = :original_summary)
          AND status = \'published\'');
    $project->execute([
        'slug' => 'wpu-enterprise-information-system',
        'title' => 'WPU Enterprise Information System',
        'summary' => 'A 2026 team project for enrolment, admission, and dormitory management.',
        'original_summary' => 'Full stack enrolment, admission and dormitory system built with a team.',
    ]);
    $updated = $project->rowCount();

    $experience = $pdo->prepare('UPDATE experiences
        SET status = \'draft\'
        WHERE title = :title
          AND organization = :organization
          AND period_label = :period_label
          AND (description = :description OR description = :original_description)
          AND status = \'published\'');
    $experience->execute([
        'title' => 'ICT Services Helpdesk Student Placement',
        'organization' => 'Divine Word University, Madang, PNG',
        'period_label' => '3 Sep 2026 (1 day)',
        'description' => 'Completed identity-verified password resets through Active Directory, checking identity by student ID. Troubleshot a Safe Exam Browser issue that left a student laptop without shutdown options. Assisted with a replacement student ID and common technical problems.',
        'original_description' => 'Reset student and staff passwords through Active Directory after verifying identity by student ID. Diagnosed and fixed a Safe Exam Browser issue that left a student laptop without shutdown options. Assisted with a replacement student ID and guided users through common technical problems.',
    ]);

    return $updated + $experience->rowCount();
}

function seed_align_designs(PDO $pdo): int
{
    $count = 0;
    $replacements = [
        'Lodestar Studio brand identity' => [
            'original' => 'Brand identity for Lodestar Studio, a design studio concept for PNG small businesses.',
            'description' => 'Created the brand identity for Lodestar Studio, a design studio concept for Papua New Guinean small businesses.',
        ],
        'Eco-friendly tableware logo contest entry' => [
            'original' => 'Logo design entered in a contest for an eco-friendly tableware brand. The brand name is not recorded on the CV.',
            'description' => 'Entered a logo design contest for an eco-friendly tableware brand.',
        ],
    ];
    foreach ($replacements as $title => $copy) {
        $statement = $pdo->prepare('UPDATE design_items
            SET description = :description
            WHERE title = :title
              AND status = \'draft\'
              AND image_path IS NULL
              AND description = :original');
        $statement->execute([
            'description' => $copy['description'],
            'title' => $title,
            'original' => $copy['original'],
        ]);
        if ($statement->rowCount() > 0) {
            $count++;
        }
    }

    return $count;
}

function seed_exists(PDO $pdo, string $sql, array $params = []): bool
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    return $statement->fetch() !== false;
}

function seed_execute(PDO $pdo, string $sql, array $params): void
{
    $statement = $pdo->prepare($sql);
    $statement->execute($params);
}
