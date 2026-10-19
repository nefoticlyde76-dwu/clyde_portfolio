<?php

declare(strict_types=1);

namespace App\Models;

class Project extends Model
{
    private const PUBLIC_COLUMNS = 'id, title, slug, category, summary, overview, purpose, role, contribution, solution,
        description, technologies, features, lessons, live_url, repository_url, cover_image_path, is_featured, display_order, updated_at';

    public function published(bool $featuredOnly = false, ?int $limit = null): array
    {
        $sql = 'SELECT ' . self::PUBLIC_COLUMNS . '
                FROM projects
                WHERE status = \'published\'';

        if ($featuredOnly) {
            $sql .= ' AND is_featured = 1';
        }

        $sql .= ' ORDER BY is_featured DESC, display_order ASC, id ASC';

        if ($limit !== null) {
            $sql .= ' LIMIT ' . max(1, min(24, $limit));
        }

        return $this->db->query($sql)->fetchAll();
    }

    public function selected(int $limit = 3): array
    {
        $featured = $this->published(true, $limit);
        if ($featured !== []) {
            return $featured;
        }

        return $this->published(false, $limit);
    }

    public function findPublishedBySlug(string $slug): ?array
    {
        $statement = $this->db->prepare(
            'SELECT ' . self::PUBLIC_COLUMNS . '
             FROM projects
             WHERE slug = :slug AND status = \'published\'
             LIMIT 1'
        );
        $statement->execute(['slug' => $slug]);
        $project = $statement->fetch();

        return $project === false ? null : $project;
    }

    public function search(string $term, string $status, int $limit, int $offset): array
    {
        [$where, $params] = $this->filters($term, $status);
        $statement = $this->db->prepare(
            'SELECT id, title, slug, category, status, is_featured, display_order, updated_at
             FROM projects' . $where . '
             ORDER BY display_order ASC, updated_at DESC, id DESC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function countSearch(string $term, string $status): int
    {
        [$where, $params] = $this->filters($term, $status);
        $statement = $this->db->prepare('SELECT COUNT(*) FROM projects' . $where);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $statement = $this->db->prepare('SELECT * FROM projects WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $project = $statement->fetch();

        return $project === false ? null : $project;
    }

    public function slugTaken(string $slug, int $exceptId = 0): bool
    {
        $sql = 'SELECT id FROM projects WHERE slug = :slug';
        $params = ['slug' => $slug];
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
            'INSERT INTO projects (
                title, slug, category, summary, overview, purpose, role, contribution, solution,
                technologies, features, lessons, description, live_url, repository_url, cover_image_path,
                is_featured, status, display_order
             ) VALUES (
                :title, :slug, :category, :summary, :overview, :purpose, :role, :contribution, :solution,
                :technologies, :features, :lessons, :description, :live_url, :repository_url, :cover_image_path,
                :is_featured, :status, :display_order
             )'
        );
        $statement->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $data['id'] = $id;
        $statement = $this->db->prepare(
            'UPDATE projects SET
                title = :title,
                slug = :slug,
                category = :category,
                summary = :summary,
                overview = :overview,
                purpose = :purpose,
                role = :role,
                contribution = :contribution,
                solution = :solution,
                technologies = :technologies,
                features = :features,
                lessons = :lessons,
                description = :description,
                live_url = :live_url,
                repository_url = :repository_url,
                cover_image_path = :cover_image_path,
                is_featured = :is_featured,
                status = :status,
                display_order = :display_order
             WHERE id = :id'
        );
        $statement->execute($data);
    }

    public function setStatus(int $id, string $status): void
    {
        $statement = $this->db->prepare('UPDATE projects SET status = :status WHERE id = :id');
        $statement->execute(['status' => $status, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare('DELETE FROM projects WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    private function filters(string $term, string $status): array
    {
        $where = [];
        $params = [];
        if ($term !== '') {
            $where[] = '(title LIKE :term OR slug LIKE :term OR category LIKE :term)';
            $params['term'] = '%' . addcslashes($term, '%_\\') . '%';
        }
        if (in_array($status, ['draft', 'published'], true)) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }

        return [$where === [] ? '' : ' WHERE ' . implode(' AND ', $where), $params];
    }
}
