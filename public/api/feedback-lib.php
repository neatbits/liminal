<?php
// Validering og sending av tilbakemeldinger. Ingen meldinger eller e-postadresser lagres på disk.
declare(strict_types=1);
namespace Liminal\Feedback;

const EMAIL = 'hello@liminalsimulator.com';
const MAX_BYTES = 20000;
const CATEGORIES = ['suggestion' => 'Suggestion', 'bug' => 'Bug report', 'comment' => 'Comment'];

function result(int $status, string $message, array $headers = []): array {
    return ['status' => $status, 'headers' => $headers, 'body' => ['ok' => $status < 400, 'message' => $message]];
}

// En låst fil gir samme grense på tvers av parallelle PHP-prosesser. Bare hash av IP og
// tidsstempler beholdes, og gamle oppføringer fjernes ved neste innsending (maks én time).
function reserve(string $file, string $ip, int $now): array {
    $dir = dirname($file);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) throw new \RuntimeException('Rate storage unavailable');
    $handle = @fopen($file, 'c+');
    if (!$handle) throw new \RuntimeException('Rate storage unavailable');
    try {
        if (!flock($handle, LOCK_EX)) throw new \RuntimeException('Rate lock unavailable');
        $raw = stream_get_contents($handle);
        $entries = $raw === '' ? [] : json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($entries)) throw new \RuntimeException('Invalid rate storage');
        foreach ($entries as $key => $times) {
            if (!is_array($times)) throw new \RuntimeException('Invalid rate storage');
            $entries[$key] = array_values(array_filter($times, static fn($t) => is_int($t) && $t > $now - 3600));
            if (!$entries[$key]) unset($entries[$key]);
        }
        $key = hash_hmac('sha256', $ip, __DIR__);
        $times = $entries[$key] ?? [];
        $retry = $times ? max(0, end($times) + 60 - $now) : 0;
        if (count($times) >= 5) $retry = max($retry, $times[0] + 3600 - $now);
        $all = array_merge([], ...array_values($entries));
        if (count($all) >= 60) $retry = max($retry, min($all) + 3600 - $now);
        if ($retry > 0) return result(429, 'Please wait before sending more feedback.', ['Retry-After' => (string) $retry]);
        $times[] = $now;
        $entries[$key] = $times;
        $json = json_encode($entries, JSON_THROW_ON_ERROR);
        rewind($handle);
        if (!ftruncate($handle, 0) || fwrite($handle, $json) !== strlen($json) || !fflush($handle)) throw new \RuntimeException('Rate write failed');
        @chmod($file, 0600);
        return result(200, 'Reserved');
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function handle(array $server, string $raw, callable $send, string $rateFile, ?int $now = null): array {
    if (($server['REQUEST_METHOD'] ?? '') !== 'POST') return result(405, 'Please use the feedback form.', ['Allow' => 'POST']);
    $host = $server['HTTP_HOST'] ?? '';
    $origin = $server['HTTP_ORIGIN'] ?? '';
    // HTTP er bare tillatt lokalt. Produksjon bruker HTTPS, også når TLS avsluttes foran PHP.
    $local = preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/D', $host) === 1;
    if (!$host || ($origin !== 'https://' . $host && !($local && $origin === 'http://' . $host))) return result(403, 'Please send feedback from this website.');
    if (strtolower(trim(explode(';', $server['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') return result(415, 'Please use the feedback form.');
    if (strlen($raw) > MAX_BYTES || (int) ($server['CONTENT_LENGTH'] ?? 0) > MAX_BYTES) return result(413, 'Your message is too long.');
    try {
        $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
    } catch (\JsonException $e) {
        return result(400, 'The message could not be read.');
    }
    if (!is_array($data)) return result(400, 'The message could not be read.');
    foreach (['website', 'message', 'email', 'category', 'page'] as $field) {
        if (isset($data[$field]) && !is_string($data[$field])) return result(400, 'Invalid feedback fields.');
    }
    // Svar stille til roboter som fyller det skjulte feltet. Ingen sending eller kvotereservasjon.
    if (trim($data['website'] ?? '') !== '') return result(200, 'Thank you for your feedback.');
    $message = trim(str_replace(["\r\n", "\r"], "\n", $data['message'] ?? ''));
    $email = trim($data['email'] ?? '');
    $category = $data['category'] ?? '';
    $page = $data['page'] ?? '';
    if (!isset(CATEGORIES[$category])) return result(400, 'Choose a feedback type.');
    if (!preg_match('/^.{10,4000}$/usD', $message) || preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', $message)) return result(400, 'Write between 10 and 4000 characters.');
    if ($email !== '' && (strlen($email) > 254 || preg_match('/[\r\n]/', $email) || !filter_var($email, FILTER_VALIDATE_EMAIL))) return result(400, 'Enter a valid email address, or leave it blank.');
    if (!in_array($page, ['home', 'simulator', 'about'], true)) return result(400, 'Invalid feedback page.');
    try {
        $reservation = reserve($rateFile, $server['REMOTE_ADDR'] ?? 'unknown', $now ?? time());
        if ($reservation['status'] !== 200) return $reservation;
        $headers = ['From' => 'Liminal Simulator <' . EMAIL . '>', 'Content-Type' => 'text/plain; charset=UTF-8', 'MIME-Version' => '1.0'];
        if ($email !== '') $headers['Reply-To'] = $email;
        $body = "Type: " . CATEGORIES[$category] . "\nPage: " . $page . "\nReply email: " . ($email ?: 'Not provided') . "\n\n" . $message;
        if (!$send(EMAIL, '[Liminal] ' . CATEGORIES[$category], $body, $headers)) throw new \RuntimeException('Mail unavailable');
    } catch (\Throwable $e) {
        error_log('Liminal feedback could not be submitted.');
        return result(503, 'Could not send right now. Please email ' . EMAIL . ' instead.');
    }
    return result(200, 'Thanks! Your feedback has been submitted.');
}
