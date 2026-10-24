<?php
// Lokal testtransport: sender ingen e-post. Kjør via npm run test:feedback.
declare(strict_types=1);
require_once __DIR__ . '/../public/api/feedback-lib.php';

function check(bool $ok, string $label): void {
    if (!$ok) throw new RuntimeException($label);
}

$root = $argv[1];
$server = ['REQUEST_METHOD' => 'POST', 'HTTP_HOST' => 'liminalsimulator.com',
    'HTTP_ORIGIN' => 'https://liminalsimulator.com', 'CONTENT_TYPE' => 'application/json', 'REMOTE_ADDR' => '198.51.100.1'];
$data = ['category' => 'bug', 'message' => "The door will not open.\nPlease check this.", 'email' => 'reader@example.com', 'website' => '', 'page' => 'simulator'];
$sent = [];
$sender = static function (...$args) use (&$sent): bool { $sent[] = $args; return true; };
$now = 1700000000;
$tests = 0;
$run = static function (string $name, callable $test) use (&$tests): void {
    $test();
    $tests++;
    echo "PASS $name\n";
};
$handle = static function (array $fields = [], array $headers = [], string $file = 'normal', ?int $at = null) use ($server, $data, $sender, $root, $now): array {
    return \Liminal\Feedback\handle(array_replace($server, $headers), json_encode(array_replace($data, $fields)), $sender, "$root/$file.json", $at ?? $now);
};

$run('fixed recipient, sender and subject; validated reply address', static function () use ($handle, &$sent) {
    check($handle(['to' => 'attacker@example.com', 'subject' => 'Untrusted'])['status'] === 200, 'valid submission');
    [$to, $subject, $body, $headers] = $sent[0];
    check($to === 'hello@liminalsimulator.com', 'fixed To');
    check($subject === '[Liminal] Bug report', 'fixed subject');
    check($headers['From'] === 'Liminal Simulator <hello@liminalsimulator.com>', 'fixed From');
    check($headers['Reply-To'] === 'reader@example.com', 'Reply-To');
    check(str_contains($body, 'The door will not open.'), 'message body');
});

$run('optional email and Unicode comments', static function () use ($handle, &$sent) {
    check($handle(['email' => '', 'message' => 'Flott simulator! Flere bassenger? 🦆', 'category' => 'comment'], [], 'unicode')['status'] === 200, 'Unicode');
    check(!isset(end($sent)[3]['Reply-To']), 'optional Reply-To');
});

$run('honeypot does not send or consume the visitor quota', static function () use ($handle, &$sent) {
    $before = count($sent);
    for ($i = 0; $i < 10; $i++) check($handle(['website' => 'https://spam.example'], [], 'trap')['status'] === 200, 'quiet honeypot');
    check(count($sent) === $before, 'no honeypot mail');
    check($handle([], [], 'trap')['status'] === 200, 'quota untouched');
});

$run('method, origin and JSON content type', static function () use ($handle) {
    $get = $handle([], ['REQUEST_METHOD' => 'GET']);
    check($get['status'] === 405 && $get['headers']['Allow'] === 'POST', 'method');
    foreach (['https://other.example', '', 'null', 'https://liminalsimulator.com.other.example'] as $origin) {
        check($handle([], ['HTTP_ORIGIN' => $origin])['status'] === 403, 'origin');
    }
    check($handle([], ['CONTENT_TYPE' => 'application/x-www-form-urlencoded'])['status'] === 415, 'content type');
    check($handle([], ['HTTP_HOST' => '127.0.0.1:5180', 'HTTP_ORIGIN' => 'http://127.0.0.1:5180'], 'local')['status'] === 200, 'localhost');
});

$run('validation rejects long messages, arrays and email header injection', static function () use ($handle) {
    foreach ([['message' => 'short'], ['message' => str_repeat('x', 4001)], ['message' => "Null\0 in the message"],
        ['email' => "reader@example.com\r\nBcc: other@example.com"], ['email' => 'not-an-email'],
        ['category' => 'unknown'], ['page' => 'https://example.com/#room=private'], ['website' => []], ['message' => []]] as $fields) {
        check($handle($fields)['status'] === 400, 'invalid fields');
    }
    check($handle(['message' => str_repeat('x', 21000)])['status'] === 413, 'actual body limit');
    check($handle([], ['CONTENT_LENGTH' => '21000'])['status'] === 413, 'declared body limit');
});

$run('invalid JSON and invalid root values', static function () use ($server, $sender, $root) {
    foreach (['{broken', 'null', '3', '"text"', "{\"message\":\"\xFF\"}"] as $raw) {
        check(\Liminal\Feedback\handle($server, $raw, $sender, "$root/invalid.json")['status'] === 400, 'invalid JSON');
    }
});

$run('one request per minute and five per hour, then quota expires', static function () use ($handle, $now) {
    for ($i = 0; $i < 5; $i++) check($handle([], [], 'ip', $now + $i * 60)['status'] === 200, 'five messages');
    $limited = $handle([], [], 'ip', $now + 300);
    check($limited['status'] === 429 && (int) $limited['headers']['Retry-After'] === 3300, 'hour limit');
    check($handle([], [], 'ip', $now + 3601)['status'] === 200, 'expiry');
    check($handle([], [], 'ip', $now + 3602)['status'] === 429, 'minute limit');
});

$run('global backstop limits distributed submissions', static function () use ($handle) {
    for ($i = 0; $i < 60; $i++) check($handle([], ['REMOTE_ADDR' => "198.51.100.$i"], 'global')['status'] === 200, 'global capacity');
    check($handle([], ['REMOTE_ADDR' => '203.0.113.1'], 'global')['status'] === 429, 'global limit');
});

$run('mail failure and damaged rate storage fail safely', static function () use ($server, $data, $root, $sender) {
    $raw = json_encode($data);
    $failed = \Liminal\Feedback\handle($server, $raw, static fn() => false, "$root/failure.json");
    check($failed['status'] === 503 && !$failed['body']['ok'], 'mail failure');
    file_put_contents("$root/broken.json", '{broken');
    check(\Liminal\Feedback\handle($server, $raw, $sender, "$root/broken.json")['status'] === 503, 'rate storage fails closed');
    check(file_get_contents("$root/broken.json") === '{broken', 'damaged data retained');
});

$run('rate storage contains no messages, reply addresses or raw IP', static function () use ($root) {
    $raw = file_get_contents("$root/normal.json");
    foreach (['reader@example.com', '198.51.100.1', 'The door'] as $private) check(!str_contains($raw, $private), 'rate data minimised');
});

echo "$tests feedback backend checks passed. No email was sent.\n";
