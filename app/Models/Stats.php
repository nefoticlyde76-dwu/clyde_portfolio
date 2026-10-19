<?php

declare(strict_types=1);

namespace App\Models;

use InvalidArgumentException;

class Stats extends Model
{
    public function counts(): array
    {
        return [
            'projects_published' => $this->count('projects', "status = 'published'"),
            'projects_draft' => $this->count('projects', "status = 'draft'"),
            'certificates' => $this->count('certificates'),
            'design_items' => $this->count('design_items'),
            'skills' => $this->count('skills'),
            'experiences' => $this->count('experiences'),
            'unread_messages' => $this->count('contact_messages', 'is_read = 0'),
        ];
    }

    public function recentProjects(int $limit = 5): array
    {
        return $this->rows(
            'SELECT id, title, status, updated_at
             FROM projects
             ORDER BY updated_at DESC, id DESC
             LIMIT ' . $this->limit($limit)
        );
    }

    public function recentMessages(int $limit = 5): array
    {
        return $this->rows(
            'SELECT id, sender_name, sender_email, subject, message, is_read, created_at
             FROM contact_messages
             ORDER BY created_at DESC, id DESC
             LIMIT ' . $this->limit($limit)
        );
    }

    private function count(string $table, string $where = '1 = 1'): int
    {
        $this->assertTable($table);
        $statement = $this->db->query('SELECT COUNT(*) FROM ' . $table . ' WHERE ' . $where);

        return (int) $statement->fetchColumn();
    }

    private function rows(string $sql): array
    {
        return $this->db->query($sql)->fetchAll();
    }

    private function limit(int $limit): int
    {
        return max(1, min(20, $limit));
    }

    private function assertTable(string $table): void
    {
        $allowed = ['projects', 'certificates', 'design_items', 'skills', 'experiences', 'contact_messages'];
        if (!in_array($table, $allowed, true)) {
            throw new InvalidArgumentException('Unknown table.');
        }
    }
}
