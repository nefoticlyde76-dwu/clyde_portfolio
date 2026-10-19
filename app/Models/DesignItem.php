<?php

declare(strict_types=1);

namespace App\Models;

class DesignItem extends Model
{
    public function published(?int $limit = null): array
    {
        $sql = 'SELECT id, title, category, description, image_path, external_url, is_featured, display_order
                FROM design_items
                WHERE status = \'published\'
                ORDER BY is_featured DESC, display_order ASC, id ASC';

        if ($limit !== null) {
            $sql .= ' LIMIT ' . max(1, min(24, $limit));
        }

        return $this->db->query($sql)->fetchAll();
    }

    public function categories(): array
    {
        $statement = $this->db->query(
            'SELECT DISTINCT category FROM design_items WHERE category <> \'\' ORDER BY category ASC'
        );

        return $statement->fetchAll(\PDO::FETCH_COLUMN);
    }

    public function search(string $term, string $status, string $category, int $limit, int $offset): array
    {
        [$where, $params] = $this->filters($term, $status, $category);
        $statement = $this->db->prepare(
            'SELECT id, title, category, status, is_featured, display_order, image_path, updated_at
             FROM design_items' . $where . '
             ORDER BY display_order ASC, updated_at DESC, id DESC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function countSearch(string $term, string $status, string $category): int
    {
        [$where, $params] = $this->filters($term, $status, $category);
        $statement = $this->db->prepare('SELECT COUNT(*) FROM design_items' . $where);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $statement = $this->db->prepare('SELECT * FROM design_items WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function create(array $data): int
    {
        $statement = $this->db->prepare(
            'INSERT INTO design_items (
                title, category, description, image_path, external_url, is_featured, status, display_order
             ) VALUES (
                :title, :category, :description, :image_path, :external_url, :is_featured, :status, :display_order
             )'
        );
        $statement->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $data['id'] = $id;
        $statement = $this->db->prepare(
            'UPDATE design_items SET
                title = :title,
                category = :category,
                description = :description,
                image_path = :image_path,
                external_url = :external_url,
                is_featured = :is_featured,
                status = :status,
                display_order = :display_order
             WHERE id = :id'
        );
        $statement->execute($data);
    }

    public function setStatus(int $id, string $status): void
    {
        $statement = $this->db->prepare('UPDATE design_items SET status = :status WHERE id = :id');
        $statement->execute(['status' => $status, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare('DELETE FROM design_items WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    private function filters(string $term, string $status, string $category): array
    {
        $where = [];
        $params = [];
        if ($term !== '') {
            $where[] = '(title LIKE :term OR category LIKE :term)';
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
