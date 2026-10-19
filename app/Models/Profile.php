<?php

declare(strict_types=1);

namespace App\Models;

class Profile extends Model
{
    public function current(): ?array
    {
        $statement = $this->db->query(
            'SELECT full_name, headline, introduction, biography, location, public_email, phone,
                    linkedin_url, github_url, resume_path, profile_image_path, seo_title, seo_description
             FROM profile_settings
             WHERE id = 1
             LIMIT 1'
        );
        $profile = $statement->fetch();

        return $profile === false ? null : $profile;
    }

    public function save(array $data): void
    {
        if ($this->current() === null) {
            $data['id'] = 1;
            $statement = $this->db->prepare(
                'INSERT INTO profile_settings (
                    id, full_name, headline, introduction, biography, location, public_email, phone,
                    linkedin_url, github_url, resume_path, profile_image_path, seo_title, seo_description
                 ) VALUES (
                    :id, :full_name, :headline, :introduction, :biography, :location, :public_email, :phone,
                    :linkedin_url, :github_url, :resume_path, :profile_image_path, :seo_title, :seo_description
                 )'
            );
            $statement->execute($data);
            return;
        }

        $statement = $this->db->prepare(
            'UPDATE profile_settings SET
                full_name = :full_name,
                headline = :headline,
                introduction = :introduction,
                biography = :biography,
                location = :location,
                public_email = :public_email,
                phone = :phone,
                linkedin_url = :linkedin_url,
                github_url = :github_url,
                resume_path = :resume_path,
                profile_image_path = :profile_image_path,
                seo_title = :seo_title,
                seo_description = :seo_description
             WHERE id = 1'
        );
        $statement->execute($data);
    }
}
