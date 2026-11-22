import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '../../../frontend/e2e/fixtures/test';
import { API_URL, capture } from '../../../tools/video-record/shots';

/**
 * The captures of video 02: slice 1.2, Backend skeleton. The slice has no screen, so its pictures
 * are what the running backend says: the API as built, started by
 * `node tools/video-record/record.mjs docs/videos/02-slice-1-2-backend-skeleton --backend` with no
 * database (port 1), and the `cf` command line. Each answer is checked before it is saved to
 * `shots/captures.js`, which the film sets in its terminals word for word. Not a test and not a
 * sweep.
 */

test.use({ baseURL: API_URL });

const backend = path.resolve(__dirname, '..', '..', '..', 'backend');

test('the API', async ({ request }) => {
  const answer = async (url: string) => {
    const response = await request.get(url);
    return {
      request: `GET ${url}`,
      status: response.status(),
      statusText: response.statusText(),
      contentType: response.headers()['content-type'],
      body: await response.text(),
    };
  };

  const live = await answer('/health/live');
  expect([live.status, live.body]).toEqual([200, 'Healthy']);
  capture('live', live);

  const ready = await answer('/health/ready');
  expect([ready.status, ready.body]).toEqual([503, 'Unhealthy']);
  capture('ready', ready);

  const refused = await answer('/api/members/me?email=someone%40example.com');
  expect(refused.status).toBe(401);
  expect(JSON.parse(refused.body)).toMatchObject({ status: 401, code: 'unauthenticated' });
  capture('refused', refused);
});

test('the cf command line', () => {
  const cf = (...args: string[]) => {
    const run = spawnSync('dotnet', ['run', '--project', 'src/ChristianFitness.Cli', '--', ...args], {
      cwd: backend,
      encoding: 'utf8',
      env: { ...process.env, ConnectionStrings__Default: 'Host=127.0.0.1;Port=1;Database=none' },
    });
    return { command: ['cf', ...args].join(' '), exit: run.status, output: `${run.stdout}${run.stderr}`.trim() };
  };

  const usage = cf();
  expect(usage.exit).toBe(1);
  capture('usage', usage);

  const seed = cf('seed');
  expect(seed.exit).toBe(2);
  capture('seedMissing', seed);
});
