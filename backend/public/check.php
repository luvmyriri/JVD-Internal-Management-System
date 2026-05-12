<?php
echo "PHP Binary: " . PHP_BINARY . "\n";
echo "Loaded php.ini: " . php_ini_loaded_file() . "\n";
echo "pdo_pgsql loaded: " . (extension_loaded('pdo_pgsql') ? 'YES' : 'NO') . "\n";
echo "PDO drivers: " . implode(', ', PDO::getAvailableDrivers()) . "\n";
