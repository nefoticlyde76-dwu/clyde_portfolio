<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use SessionUpdateTimestampHandlerInterface;

final class DatabaseSessionHandler implements \SessionHandlerInterface, \SessionUpdateTimestampHandlerInterface
{
    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        return true;
    }

    public function read(string $id): string|false
    {
        $statement = Database::connection()->prepare(
            'SELECT session_data FROM app_sessions WHERE session_id = :session_id AND expires_at > :now'
        );
        $statement->execute(['session_id' => $id, 'now' => time()]);
        $data = $statement->fetchColumn();

        return $data === false ? '' : (string) $data;
    }

    public function write(string $id, string $data): bool
    {
        $expiresAt = time() + (int) ini_get('session.gc_maxlifetime');
        $statement = Database::connection()->prepare(
            'INSERT INTO app_sessions (session_id, session_data, expires_at)
             VALUES (:session_id, :session_data, :expires_at)
             ON DUPLICATE KEY UPDATE session_data = VALUES(session_data), expires_at = VALUES(expires_at)'
        );
        $statement->bindValue(':session_id', $id);
        $statement->bindValue(':session_data', $data, PDO::PARAM_LOB);
        $statement->bindValue(':expires_at', $expiresAt, PDO::PARAM_INT);

        return $statement->execute();
    }

    public function validateId(string $id): bool
    {
        $statement = Database::connection()->prepare(
            'SELECT 1 FROM app_sessions WHERE session_id = :session_id AND expires_at > :now'
        );
        $statement->execute(['session_id' => $id, 'now' => time()]);

        return $statement->fetchColumn() !== false;
    }

    public function updateTimestamp(string $id, string $data): bool
    {
        return $this->write($id, $data);
    }

    public function destroy(string $id): bool
    {
        $statement = Database::connection()->prepare(
            'DELETE FROM app_sessions WHERE session_id = :session_id'
        );

        return $statement->execute(['session_id' => $id]);
    }

    public function gc(int $max_lifetime): int|false
    {
        $statement = Database::connection()->prepare(
            'DELETE FROM app_sessions WHERE expires_at <= :expires_before'
        );
        $statement->execute(['expires_before' => time()]);

        return $statement->rowCount();
    }
}
