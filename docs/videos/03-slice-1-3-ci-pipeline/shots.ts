import { spawnSync } from 'node:child_process';
import { expect, test } from '../../../frontend/e2e/fixtures/test';
import { capture } from '../../../tools/video-record/shots';

/**
 * The captures of video 03: slice 1.3, CI pipeline. The slice has no screen and no endpoint: its
 * system is the GitHub Actions workflow, so its pictures are what GitHub said about the runs of
 * this slice's own pull request (#4), read with `gh run view` by
 * `node tools/video-record/record.mjs docs/videos/03-slice-1-3-ci-pipeline --commands`. Each run
 * is checked before it is saved to `shots/captures.js`, which the film sets word for word. Not a
 * test and not a sweep.
 */

/** The runs of pull request #4 the film shows, in the order they ran. */
const RUNS = {
  /** The first run: the frontend job alone, with every cache cold. */
  cold: 45040854893,
  /** Lint broken on purpose: an unused constant. */
  lint: 45041046230,
  /** A compiler warning added on purpose. */
  warning: 45041314433,
  /** The member app's title changed and /health/live closed, on purpose. */
  specAndTest: 45041472511,
  /** Everything restored, both jobs, warm caches. */
  green: 45041635582,
};

interface Step {
  name: string;
  conclusion: string;
  startedAt: string;
  completedAt: string;
}
interface Job extends Step {
  steps: Step[];
}

const gh = (...args: string[]): string => {
  const run = spawnSync('gh', args, { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`gh ${args.join(' ')} failed: ${run.stderr}`);
  return run.stdout;
};

const seconds = (s: Step) => Math.round((Date.parse(s.completedAt) - Date.parse(s.startedAt)) / 1000);

/** A run as the film needs it: each job and each step that ran, with its conclusion and seconds. */
const runOf = (id: number) => {
  const run = JSON.parse(gh('run', 'view', String(id), '--json', 'conclusion,headSha,event,url,jobs')) as {
    conclusion: string;
    headSha: string;
    event: string;
    url: string;
    jobs: Job[];
  };
  return {
    id,
    url: run.url,
    event: run.event,
    sha: run.headSha.slice(0, 7),
    conclusion: run.conclusion,
    jobs: run.jobs
      .map((job) => ({
        name: job.name,
        conclusion: job.conclusion,
        seconds: seconds(job),
        steps: job.steps
          .filter((s) => !s.name.startsWith('Post ') && s.name !== 'Set up job' && s.name !== 'Complete job')
          .map((s) => ({ name: s.name, conclusion: s.conclusion, seconds: seconds(s) })),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
};

/** The lines of a failed run's log that say why, without timestamps or the runner's paths. */
const said = (id: number, keep: RegExp) =>
  gh('run', 'view', String(id), '--log-failed')
    .split('\n')
    .map((line) => line.split('\t'))
    .filter((cols) => cols.length >= 3)
    .map(([job, step, rest]) => ({
      job,
      step,
      text: rest
        .replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, '')
        .replace(/##\[(error|notice)\]/, '')
        .replaceAll('/home/runner/work/christian-fitness/christian-fitness/', '')
        .replace(/ \[[^\]]*\.csproj\]$/, '')
        .trim(),
    }))
    .filter((line) => keep.test(line.text))
    .filter((line, i, all) => all.findIndex((other) => other.step === line.step && other.text === line.text) === i);

test('the runs of pull request #4', () => {
  const failedStep = (run: ReturnType<typeof runOf>) =>
    run.jobs.flatMap((job) => job.steps.filter((s) => s.conclusion === 'failure').map((s) => `${job.name} › ${s.name}`));

  const cold = runOf(RUNS.cold);
  expect(cold.conclusion).toBe('success');
  capture('cold', cold);

  const lint = runOf(RUNS.lint);
  expect([lint.conclusion, failedStep(lint)]).toEqual(['failure', ['Frontend › Lint']]);
  capture('lint', { ...lint, said: said(RUNS.lint, /no-unused-vars|problem/) });

  const warning = runOf(RUNS.warning);
  expect([warning.conclusion, failedStep(warning)]).toEqual(['failure', ['Backend › Build (warnings as errors)']]);
  capture('warning', { ...warning, said: said(RUNS.warning, /error CS/) });

  const specAndTest = runOf(RUNS.specAndTest);
  expect([specAndTest.conclusion, failedStep(specAndTest).sort()]).toEqual([
    'failure',
    ['Backend › Test', 'Frontend › Behaviour specs'],
  ]);
  capture('specAndTest', { ...specAndTest, said: said(RUNS.specAndTest, /^(Expected|Received|Actual|Failed!)/) });

  const green = runOf(RUNS.green);
  expect(green.conclusion).toBe('success');
  expect(green.jobs.map((job) => [job.name, job.conclusion])).toEqual([
    ['Backend', 'success'],
    ['Frontend', 'success'],
  ]);
  capture('green', {
    ...green,
    passed: gh('run', 'view', String(RUNS.green), '--log')
      .split('\n')
      .map((line) => line.split('\t')[2] ?? '')
      .filter((text) => /Passed!|\d+ passed/.test(text) && !text.includes('##[notice]'))
      .map((text) => text.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, '').trim()),
  });
});
