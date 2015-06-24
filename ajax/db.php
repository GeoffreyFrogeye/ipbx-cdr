<?php

require '../vendor/autoload.php';

$dotenv = new Dotenv\Dotenv(__DIR__.'/..');
$dotenv->load();
$dotenv->required(['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASS']);

$sql = new mysqli(getenv('DB_HOST'), getenv('DB_USER'), getenv('DB_PASS'), getenv('DB_NAME'));

if ($sql->connect_error) {
    http_response_code(503);
    die("Connection to database error (".$sql->connect_errno.") ".$sql->connect_error);
}

?>
