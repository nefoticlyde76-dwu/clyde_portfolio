<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $config = app_config();
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
            $config['db_host'],
            $config['db_port'],
            $config['db_name']
        );

        try {
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ];
            if ($config['db_ssl']) {
                if (!defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
                    throw new \RuntimeException('The MySQL PDO driver does not support verified TLS.');
                }
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
                if ($config['db_ssl_ca'] !== '') {
                    if (!defined('PDO::MYSQL_ATTR_SSL_CA')) {
                        throw new \RuntimeException('The MySQL PDO driver does not support a custom TLS CA.');
                    }
                    $options[PDO::MYSQL_ATTR_SSL_CA] = $config['db_ssl_ca'];
                }
            }

            self::$connection = new PDO(
                $dsn,
                $config['db_user'],
                $config['db_pass'],
                $options
            );
        } catch (PDOException $exception) {
            app_log('Database connection failed: ' . $exception->getMessage());
            throw new PDOException('Database connection failed.', (int) $exception->getCode());
        }

        return self::$connection;
    }
}
