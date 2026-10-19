<?php

declare(strict_types=1);

namespace App\Models;

class Admin extends Model
{
    public function findByEmail(string $email): ?array
    {
        $statement = $this->db->prepare(
            'SELECT id, name, email, password_hash
             FROM admins
             WHERE email = :email
             LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $admin = $statement->fetch();

        return $admin === false ? null : $admin;
    }

    public function create(string $name, string $email, string $passwordHash): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO admins (name, email, password_hash)
             VALUES (:name, :email, :password_hash)'
        );
        $statement->execute([
            'name' => $name,
            'email' => $email,
            'password_hash' => $passwordHash,
        ]);

        return (int) $this->db->lastInsertId();
    }
}
