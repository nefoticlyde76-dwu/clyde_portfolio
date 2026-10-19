<?php

declare(strict_types=1);

namespace App\Models;

class Certificate extends Model
{
    public function published(): array
    {
        $statement = $this->db->query(
            'SELECT id, title, issuing_organization, issued_on, credential_url, credential_id,
                    file_path, display_image_path, description, display_order, updated_at
             FROM certificates
             WHERE status = \'published\'
             ORDER BY display_order ASC, issued_on DESC, id ASC'
        );

        return $statement->fetchAll();
    }

    public function search(string $term, string $status, int $limit, int $offset): array
    {
        [$where, $params] = $this->filters($term, $status);
        $statement = $this->db->prepare(
            'SELECT id, title, issuing_organization, issued_on, status, display_order, updated_at
             FROM certificates' . $where . '
             ORDER BY display_order ASC, updated_at DESC, id DESC
             LIMIT ' . $limit . ' OFFSET ' . $offset
        );
        $statement->execute($params);

        return $statement->fetchAll();
    }

    public function countSearch(string $term, string $status): int
    {
        [$where, $params] = $this->filters($term, $status);
        $statement = $this->db->prepare('SELECT COUNT(*) FROM certificates' . $where);
        $statement->execute($params);

        return (int) $statement->fetchColumn();
    }

    public function find(int $id): ?array
    {
        $statement = $this->db->prepare('SELECT * FROM certificates WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function findPublished(int $id): ?array
    {
        $statement = $this->db->prepare(
            'SELECT * FROM certificates WHERE id = :id AND status = \'published\' LIMIT 1'
        );
        $statement->execute(['id' => $id]);
        $row = $statement->fetch();

        return $row === false ? null : $row;
    }

    public function credentialTaken(string $credentialId, int $exceptId = 0): bool
    {
        $sql = 'SELECT id FROM certificates WHERE credential_id = :credential_id';
        $params = ['credential_id' => $credentialId];
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
            'INSERT INTO certificates (
                title, issuing_organization, issued_on, credential_url, credential_id,
                file_path, display_image_path, description, status, display_order
             ) VALUES (
                :title, :issuing_organization, :issued_on, :credential_url, :credential_id,
                :file_path, :display_image_path, :description, :status, :display_order
             )'
        );
        $statement->execute($data);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $data['id'] = $id;
        $statement = $this->db->prepare(
            'UPDATE certificates SET
                title = :title,
                issuing_organization = :issuing_organization,
                issued_on = :issued_on,
                credential_url = :credential_url,
                credential_id = :credential_id,
                file_path = :file_path,
                display_image_path = :display_image_path,
                description = :description,
                status = :status,
                display_order = :display_order
             WHERE id = :id'
        );
        $statement->execute($data);
    }

    public function setStatus(int $id, string $status): void
    {
        $statement = $this->db->prepare('UPDATE certificates SET status = :status WHERE id = :id');
        $statement->execute(['status' => $status, 'id' => $id]);
    }

    public function delete(int $id): void
    {
        $statement = $this->db->prepare('DELETE FROM certificates WHERE id = :id');
        $statement->execute(['id' => $id]);
    }

    private function filters(string $term, string $status): array
    {
        $where = [];
        $params = [];
        if ($term !== '') {
            $where[] = '(title LIKE :term OR issuing_organization LIKE :term OR credential_id LIKE :term)';
            $params['term'] = '%' . addcslashes($term, '%_\\') . '%';
        }
        if (in_array($status, ['draft', 'published'], true)) {
            $where[] = 'status = :status';
            $params['status'] = $status;
        }

        return [$where === [] ? '' : ' WHERE ' . implode(' AND ', $where), $params];
    }
}
