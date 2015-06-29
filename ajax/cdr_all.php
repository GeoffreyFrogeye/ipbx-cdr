<?php

require 'db.php';

$typesQ = $sql->query('SHOW COLUMNS FROM `bit_cdr`');

$types = [];

while ($row = $typesQ->fetch_assoc()) {
    $types[$row['Field']] = explode('(', $row['Type'])[0];
}

date_default_timezone_set($_ENV['TIMEZONE']);

$query = $sql->query('SELECT * FROM `bit_cdr`');

$calls = [];

// OPTZ Send serialized objects
while ($row = $query->fetch_assoc()) {
    foreach ($row as $field => $data) {
        switch ($types[$field]) {
            case 'tinyint':
            case 'int':
                $row[$field] = intval($data);
                break;
            case 'datetime':
                $row[$field] = strtotime($data) * 1000;
                break;
        }
    }
    $calls[] = $row;
}

echo json_encode($calls);
