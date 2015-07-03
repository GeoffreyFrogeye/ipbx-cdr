<?php

$request = explode('?', $_SERVER['REQUEST_URI'])[0];
$request = explode('/', $request);
$request = $request[count($request) - 1];


if ($request == '') {
    $request = 'home';
}

$page = 'pages/'.$request.'.html';

if (!file_exists($page)) {
    $page = 'pages/404.html';
}

$content = file_get_contents($page);

if (isset($_SERVER['HTTP_X_PJAX'])) {
    echo $content;
} else {
    $layout = file_get_contents('pages/layout.html');
    echo implode($content, explode('{{content}}', $layout));
}
