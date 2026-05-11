<?php
$passwords = ["postgres", "root", "password", "admin", "1234", "123456"];
foreach ($passwords as $p) {
    try {
        $pdo = new PDO("pgsql:host=127.0.0.1;port=5432", "postgres", $p);
        echo "FOUND: $p\n";
        exit(0);
    } catch (Exception $e) { }
}
echo "NOTFOUND\n";
