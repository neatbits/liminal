// Kontrollerer skjemaet i nettleseren med avskåret nettverk. Ingen e-post sendes.
import assert from 'node:assert/strict';
import { waitFor } from './browser-driver.mjs';

export async function checkFeedback(browser, page) {
  const { call, evaluate, on } = browser;
  const requests = [];
  const responses = [
    { status: 429, message: 'Please wait before sending more feedback.' },
    { status: 503, message: 'Could not send right now. Please email hello@liminalsimulator.com instead.' },
    { status: 200, message: 'Thanks! Your feedback has been submitted.' },
  ];
  const off = on('Fetch.requestPaused', async ({ requestId, request }) => {
    requests.push(request);
    const response = responses[requests.length - 1] ?? { status: 500, message: 'Unexpected duplicate request' };
    // Lar to submit-hendelser nå frontend før svaret; bare én må sendes.
    await new Promise((r) => setTimeout(r, 100));
    await call('Fetch.fulfillRequest', {
      requestId, responseCode: response.status,
      responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
      body: Buffer.from(JSON.stringify({ ok: response.status === 200, message: response.message })).toString('base64'),
    });
  });
  await call('Fetch.enable', { patterns: [{ urlPattern: '*api/feedback.php', requestStage: 'Request' }] });
  try {
    await evaluate(`document.querySelector('[data-feedback]').click()`);
    assert.equal(await evaluate(`document.querySelector('.modal-head h2').textContent`), 'Suggestions & feedback');
    await evaluate(`(() => {
      const form = document.querySelector('.feedback-form');
      form.elements.message.value = 'short';
      form.requestSubmit();
    })()`);
    assert.equal(requests.length, 0, 'invalid messages are not submitted');
    await evaluate(`(() => {
      const form = document.querySelector('.feedback-form');
      form.elements.category.value = 'bug';
      form.elements.email.value = 'reader@example.com';
      form.elements.message.value = 'The pool door does not open. Can you check it?';
      form.requestSubmit();
      form.requestSubmit();
    })()`);
    await waitFor(() => evaluate(`document.querySelector('.feedback-status')?.textContent.includes('Please wait')`), 'feedback rate limit');
    assert.equal(requests.length, 1, 'duplicate submissions are blocked');
    assert.equal(await evaluate(`document.querySelector('[name=message]').value`), 'The pool door does not open. Can you check it?');
    assert.equal(await evaluate(`document.querySelector('.modal .btn-accent').disabled`), false);
    await evaluate(`document.querySelector('.feedback-form').requestSubmit()`);
    await waitFor(() => evaluate(`document.querySelector('.feedback-status')?.textContent.includes('Could not send')`), 'feedback mail failure');
    await evaluate(`document.querySelector('.feedback-form').requestSubmit()`);
    await waitFor(() => evaluate(`document.querySelector('.feedback-form')?.textContent.includes('Thanks!')`), 'feedback success');
    assert.equal(requests.length, 3);
    for (const request of requests) {
      assert.equal(request.method, 'POST');
      assert.equal(new URL(request.url).pathname, '/api/feedback.php');
      assert.deepEqual(JSON.parse(request.postData), {
        category: 'bug', email: 'reader@example.com', message: 'The pool door does not open. Can you check it?', website: '', page,
      });
    }
    await evaluate(`document.querySelector('.modal-close').click()`);
    console.log(`PASS ${page} feedback validation, rate limit, failure, retry and success (mock mail)`);
  } finally {
    await call('Fetch.disable');
    off();
  }
}
