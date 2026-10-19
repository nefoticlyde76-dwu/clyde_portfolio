<?php

declare(strict_types=1);

namespace App\Models;

class Experience extends Model
{
    public function published(): array
    {
        $statement = $this->db->query(
            'SELECT id, title, organization, period_label, description, experience_type, display_order
             FROM experiences
             WHERE status = \'published\'
             ORDER BY display_order ASC, id ASC'
        );

        return $statement->fetchAll();
    }

    public function search(string $term, string $status, string $type, int $limit, int $offset): array
    {
        [$where, $params] = $this->filters($term, $status, $type);
        $statement = $this->db->prepare(
            'SELECT id, title, organization, period_label, experience_type, status, is_current, display_order, updated_at
             FROM experiences' . $where . '
             ORDER BY display_order ASC, id ASC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function countSearch(string $term, string $status, string $type): int
    {
        [$where, $params] = $this->filters($term, $status, $type);
        $statement = $this->db->prepare('SELECT COUNT(*) FROM experiences' . $where);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $statement = $this->db->prepare('SELECT * FROM experiences WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function create(array $data): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO experiences (
                title, organization, period_label, started_on, ended_on, is_current,
                description, experience_type, status, display_order
             ) VALUES (
                :title, :organization, :period_label, :started_on, :ended_on, :is_current,
                :description, :experience_type, :status, :display_order
             )'
        );
        $statement->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $data['id'] = $id;
        $statement = $this->db->prepare(
            'UPDATE experiences SET
                title = :title,
                organization = :organization,
                period_label = :period_label,
                started_on = :started_on,
                ended_on = :ended_on,
                is_current = :is_current,
                description = :description,
                experience_type = :experience_type,
                status = :status,
                display_order = :display_order
             WHERE id = :id'
        );
        $statement->execute($data);
    }

    public function setStatus(int $id, string $status): void
    {
        $statement = $this->db->prepare('UPDATE experiences SET status = :status WHERE id = :id');
        $statement->execute(['status' => $status, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare('DELETE FROM experiences WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    private function filters(string $term, string $status, string $type): array
    {
        $where = [];
        $params = [];
        if ($term !== '') {
            $where[] = '(title LIKE :term OR organization LIKE :term)';
            $params['term'] = '%' . addcslashes($term, '%_\\') . '%';
        }
        if (in_array($status, ['draft', 'published'], true)) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        if ($type !== '') {
            $where[] = 'experience_type = :experience_type';
            $params['experience_type'] = $type;
        }

        return [$where === [] ? '' : ' WHERE ' . implode(' AND ', $where), $params];
    }
}
