<?php

require 'db.php';

$query = $sql->query("SELECT * FROM `bit_cdr`");

$data = [];

while ($row = $query->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);

?>
