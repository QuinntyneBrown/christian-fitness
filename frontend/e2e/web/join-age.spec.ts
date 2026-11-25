import { expect, test } from '../fixtures/test';
import { WebJoinPage } from '../page-objects/web/join.page';
test('Join requires a deliberate age confirmation before sending', async ({ page, api }) => {
  const sent: unknown[] = [];
  api.on('POST', '/api/account/join', (request) => {
    sent.push(request.postDataJSON());
    return { status: 400, json: { code: 'age_not_confirmed' } };
  });
  const join = new WebJoinPage(page);
  await join.open();
  await expect(join.age).toBeVisible();
  await expect(join.age).not.toBeChecked();
  await join.fullName.fill('Grace Thompson');
  await join.email.fill('grace@example.org');
  await join.password.fill('abundantlife');
  await join.submit();
  await expect(join.alert).toBeFocused();
  await expect(join.age).toHaveAttribute('aria-invalid', 'true');
  await expect(join.alertLinks).toHaveText("Confirm you're 16 or older to create a profile");
  expect(sent).toEqual([]);
  await expect(join.termsSentence).toHaveText(
    'By creating a profile you agree to our Terms of Service and Privacy Policy.',
  );
  await expect(join.termsSentence.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
    'href',
    '/terms',
  );
  await expect(join.termsSentence.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy',
  );
  await join.age.check();
  await join.submitAndAwaitAnswer();
  await expect(join.age).toHaveAttribute('aria-invalid', 'true');
  expect(sent).toHaveLength(1);
  expect(sent[0]).toMatchObject({ ageConfirmed: true });
});
