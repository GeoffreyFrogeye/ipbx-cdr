<?php

require 'db.php';

$typesQ = $sql->query("SHOW COLUMNS FROM `bit_cdr`");

$types = [];

while ($row = $typesQ->fetch_assoc()) {
    $types[$row['Field']] = explode('(', $row['Type'])[0];
}

$query = $sql->query("SELECT * FROM `bit_cdr`");

$calls = [];

while ($row = $query->fetch_assoc()) {
    foreach ($row as $field => $data) {
        if ($types[$field] == 'int') { // FIXME Handle tinyint and others
            $row[$field] = intval($data);
        }
    }
    $calls[] = $row;
}

echo json_encode($calls);

?>
