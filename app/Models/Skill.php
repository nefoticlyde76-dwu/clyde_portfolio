<?php

declare(strict_types=1);

namespace App\Models;

class Skill extends Model
{
    public function grouped(): array
    {
        $statement = $this->db->query(
            'SELECT id, name, category, display_order
             FROM skills
             WHERE status = \'published\'
             ORDER BY display_order ASC, id ASC'
        );

        $groups = [];
        foreach ($statement->fetchAll() as $skill) {
            $category = (string) $skill['category'];
            $groups[$category][] = $skill;
        }

        return $groups;
    }

    public function categoriesInUse(): array
    {
        $statement = $this->db->query('SELECT DISTINCT category FROM skills ORDER BY category ASC');

        return $statement->fetchAll(\PDO::FETCH_COLUMN);
    }

    public function search(string $term, string $status, string $category, int $limit, int $offset): array
    {
        [$where, $params] = $this->filters($term, $status, $category);
        $statement = $this->db->prepare(
            'SELECT id, name, category, status, display_order, updated_at
             FROM skills' . $where . '
             ORDER BY display_order ASC, category ASC, name ASC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function countSearch(string $term, string $status, string $category): int
    {
        [$where, $params] = $this->filters($term, $status, $category);
        $statement = $this->db->prepare('SELECT COUNT(*) FROM skills' . $where);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $statement = $this->db->prepare('SELECT * FROM skills WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function nameTaken(string $category, string $name, int $exceptId = 0): bool
    {
        $sql = 'SELECT id FROM skills WHERE category = :category AND name = :name';
        $params = ['category' => $category, 'name' => $name];
        if ($exceptId > 0) {
            $sql .= ' AND id <> :id';
            $params['id'] = $exceptId;
        }
        $statement = $this->db->prepare($sql . ' LIMIT 1');
        $statement->execute($params);

        return $statement->fetch() !== false;
    }

    public function create(array $data): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO skills (name, category, display_order, status)
             VALUES (:name, :category, :display_order, :status)'
        );
        $statement->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $data['id'] = $id;
        $statement = $this->db->prepare(
            'UPDATE skills SET
                name = :name,
                category = :category,
                display_order = :display_order,
                status = :status
             WHERE id = :id'
        );
        $statement->execute($data);
    }

    public function setStatus(int $id, string $status): void
    {
        $statement = $this->db->prepare('UPDATE skills SET status = :status WHERE id = :id');
        $statement->execute(['status' => $status, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare('DELETE FROM skills WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    private function filters(string $term, string $status, string $category): array
    {
        $where = [];
        $params = [];
        if ($term !== '') {
            $where[] = 'name LIKE :term';
            $params['term'] = '%' . addcslashes($term, '%_\\') . '%';
        }
        if (in_array($status, ['draft', 'published'], true)) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }
        if ($category !== '') {
            $where[] = 'category = :category';
            $params['category'] = $category;
        }

        return [$where === [] ? '' : ' WHERE ' . implode(' AND ', $where), $params];
    }
}
