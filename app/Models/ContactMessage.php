<?php

declare(strict_types=1);

namespace App\Models;

class ContactMessage extends Model
{
    public function countRecentByEmail(string $email, string $since): int
    {
        $statement = $this->db->prepare(
            'SELECT COUNT(*) AS total
             FROM contact_messages
             WHERE sender_email = :email AND created_at >= :since'
        );
        $statement->execute([
            'email' => $email,
            'since' => $since,
        ]);

        return (int) $statement->fetchColumn();
    }

    public function create(string $name, string $email, string $subject, string $message): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO contact_messages (sender_name, sender_email, subject, message, is_read)
             VALUES (:sender_name, :sender_email, :subject, :message, 0)'
        );
        $statement->execute([
            'sender_name' => $name,
            'sender_email' => $email,
            'subject' => $subject,
            'message' => $message,
        ]);

        return (int) $this->db->lastInsertId();
    }

    public function search(string $term, string $read, int $limit, int $offset): array
    {
        [$where, $params] = $this->filters($term, $read);
        $statement = $this->db->prepare(
            'SELECT id, sender_name, sender_email, subject, is_read, created_at
             FROM contact_messages' . $where . '
             ORDER BY created_at DESC, id DESC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function countSearch(string $term, string $read): int
    {
        [$where, $params] = $this->filters($term, $read);
        $statement = $this->db->prepare('SELECT COUNT(*) FROM contact_messages' . $where);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $statement = $this->db->prepare('SELECT * FROM contact_messages WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function setRead(int $id, int $isRead): void
    {
        $statement = $this->db->prepare('UPDATE contact_messages SET is_read = :is_read WHERE id = :id');
        $statement->execute(['is_read' => $isRead === 1 ? 1 : 0, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare('DELETE FROM contact_messages WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    private function filters(string $term, string $read): array
    {
        $where = [];
        $params = [];
        if ($term !== '') {
            $where[] = '(sender_name LIKE :term OR sender_email LIKE :term OR subject LIKE :term)';
            $params['term'] = '%' . addcslashes($term, '%_\\') . '%';
        }
        if ($read === 'read') {
            $where[] = 'is_read = 1';
        } elseif ($read === 'unread') {
            $where[] = 'is_read = 0';
        }

        return [$where === [] ? '' : ' WHERE ' . implode(' AND ', $where), $params];
    }
}
