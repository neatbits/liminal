<?php
declare(strict_types=1);
require_once __DIR__ . '/feedback-lib.php';

// Denne filen kopieres med Vites public/ til dist/api/ og kjøres av PHP på webhotellet.
// Begrens lesingen før JSON-parsing. Ingen SMTP-passord eller brukerinput i To/From/Subject.
$raw = file_get_contents('php://input', false, null, 0, \Liminal\Feedback\MAX_BYTES + 1);
$rateFile = sys_get_temp_dir() . '/liminal-feedback-' . substr(hash('sha256', __DIR__), 0, 16) . '/limits.json';
$result = \Liminal\Feedback\handle($_SERVER, $raw === false ? '' : $raw,
    static fn($to, $subject, $body, $headers) => @mail($to, $subject, $body, $headers), $rateFile);

http_response_code($result['status']);
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
foreach ($result['headers'] as $name => $value) header($name . ': ' . $value);
echo json_encode($result['body']);
