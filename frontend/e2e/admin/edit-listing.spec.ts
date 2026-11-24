import { adminListings, answerListings, CAST_LISTINGS } from '../fixtures/admin-listings';
import { expect, MODERATOR_SIGNED_IN, test } from '../fixtures/test';
import { ListingEditorDialog } from '../page-objects/admin/listing-editor.dialog';
import { ManageServicesPage } from '../page-objects/admin/manage-services.page';

const LISTINGS = '/api/admin/services/listings';
const [DANIELLE, MARCUS] = CAST_LISTINGS;

// L2-027 AC1 (slice 23.1; ADR 0054): staff see the live listings and edit one; members see the change.
test.describe('Admin app, live listings and the listing editor', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock admin-services/default.
  test('lists each live listing with its role, category, rate and verified month', async ({
    page,
    api,
  }) => {
    answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.listingsHeading).toContainText('Live listings');
    await expect(services.listingsCount).toHaveText('5');
    await expect(services.listingRows).toHaveCount(5);
    expect(await services.listingTexts()).toEqual([
      ['Danielle Okafor | Personal trainer', 'Training', 'From $70 / session', 'Mar 2026'],
      ['Marcus Lee, RD | Registered dietitian', 'Nutrition', '$95 first consult', 'Mar 2026'],
      ['Ruth Abernathy | Physiotherapist', 'Physio', '$110 assessment', 'Mar 2026'],
      ['Tasha Grant | Basketball skills coach', 'Coaching', 'From $45 / session', 'Mar 2026'],
      [
        'Rev. James Whitfield | Faith & wellness counsellor',
        'Counselling',
        'Sliding scale',
        'Mar 2026',
      ],
    ]);
    await expect(services.editButton('Danielle Okafor')).toBeVisible();
  });

  test('shows listing names as text, never as HTML', async ({ page, api }) => {
    answerListings(api, [{ ...DANIELLE, name: '<b>Danielle</b> Okafor' }]);
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.listingRows.first()).toContainText('<b>Danielle</b> Okafor');
  });

  // Mock admin-services/empty.
  test('with nobody listed, says there are no listings yet', async ({ page }) => {
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.listingsCount).toHaveText('0');
    await expect(services.listingsEmpty).toContainText('No listings yet');
    await expect(services.listingRows).toHaveCount(0);
  });

  // Mock listing-editor/edit.
  test('Edit opens the editor with the listing as it stands, and Cancel sends nothing', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();

    await services.editButton('Marcus Lee, RD').click();

    await expect(editor.heading).toHaveText('Edit listing');
    await expect(editor.name).toHaveValue('Marcus Lee, RD');
    await expect(editor.role).toHaveValue('Registered dietitian');
    await expect(editor.category).toHaveValue('Nutrition');
    await expect(editor.where).toHaveValue('Virtual · Ontario-wide');
    await expect(editor.rate).toHaveValue('$95 first consult');
    await expect(editor.credentials).toHaveValue('Registered Dietitian, CDO');
    await expect(editor.about).toHaveValue('Practical meal planning for families.');
    await expect(editor.contactLink).toHaveValue('https://marcus.example.org/book');
    await expect(editor.labels).toContainText([
      'Name',
      'Role',
      'Category',
      'Where',
      'Rate',
      'Credentials',
      'About',
      'Contact link',
    ]);

    await editor.cancelButton.click();

    await expect(editor.dialog).toHaveCount(0);
    expect(listings.saves).toEqual([]);
  });

  test('Save changes sends the fields, closes, says so and shows the change in the list', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();
    await services.editButton('Danielle Okafor').click();

    await editor.fill({
      name: 'Danielle O. Okafor',
      role: 'Strength coach',
      category: 'Coaching',
      where: 'Virtual · Ontario-wide',
      rate: 'From $80 / session',
      credentials: 'NSCA-CPT',
      about: 'Strength for busy parents.',
      contactLink: 'https://danielle.example.org/book',
    });
    await editor.save();

    await expect(editor.dialog).toHaveCount(0);
    expect(listings.saves).toEqual([
      {
        id: DANIELLE.id,
        body: {
          name: 'Danielle O. Okafor',
          role: 'Strength coach',
          category: 'Coaching',
          where: 'Virtual · Ontario-wide',
          price: 'From $80 / session',
          credentials: 'NSCA-CPT',
          about: 'Strength for busy parents.',
          contactUrl: 'https://danielle.example.org/book',
        },
      },
    ]);
    await expect(services.toastTitle).toHaveText('Changes saved');
    await expect(services.toastText).toHaveText('Danielle O. Okafor is updated.');
    await expect(services.listingRows.first()).toContainText('Strength coach');
    await expect(services.listingRows.first()).toContainText('Coaching');
    await expect(services.listingRows.first()).toContainText('From $80 / session');
    await expect(services.editButton('Danielle O. Okafor')).toBeFocused();
  });

  test('emptying the contact link saves it as none', async ({ page, api }) => {
    const listings = answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();
    await services.editButton('Marcus Lee, RD').click();

    await editor.fill({ contactLink: '' });
    await editor.save();

    await expect(editor.dialog).toHaveCount(0);
    expect(listings.saves[0].id).toBe(MARCUS.id);
    expect(listings.saves[0].body['contactUrl']).toBeNull();
  });

  // Mock listing-editor/edit-invalid.
  test('a field the server refuses is named on its field and in the summary, and the values stay', async ({
    page,
    api,
  }) => {
    answerListings(api, CAST_LISTINGS, {
      refuse: () => ({
        json: {
          code: 'validation_failed',
          errors: { contactUrl: ['x'] },
          fieldCodes: { contactUrl: 'contact_link_invalid' },
        },
      }),
    });
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();
    await services.editButton('Danielle Okafor').click();

    await editor.fill({ contactLink: 'ftp://nope' });
    await editor.save();

    await expect(editor.alertTitle).toHaveText('1 thing to fix before saving');
    await expect(editor.alertLinks).toHaveText([
      'Enter an http or https address, or leave it empty',
    ]);
    await expect(editor.fieldError('f-contact')).toHaveText(
      'Enter an http or https address, or leave it empty',
    );
    await expect(editor.contactLink).toHaveAttribute('aria-invalid', 'true');
    await expect(editor.contactLink).toHaveValue('ftp://nope');
    await expect(editor.dialog).toBeVisible();
  });

  // Mock listing-editor/failed.
  test('a save that does not go through keeps the editor open and the values, and Save again works', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS, {
      refuse: (number) => (number === 0 ? { abort: true } : null),
    });
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();
    await services.editButton('Danielle Okafor').click();
    await editor.fill({ role: 'Head coach' });

    await editor.save();

    await expect(editor.alertTitle).toHaveText("Couldn't save the changes");
    await expect(editor.role).toHaveValue('Head coach');

    await editor.save();

    await expect(editor.dialog).toHaveCount(0);
    expect(listings.saves).toHaveLength(2);
    await expect(services.toastTitle).toHaveText('Changes saved');
  });

  // Mock listing-editor/busy.
  test('while saving, the button reads Saving, the fields hold still and Escape does not close it', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerListings(api, CAST_LISTINGS, { hold: gate });
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();
    await services.editButton('Danielle Okafor').click();

    await editor.save();

    await expect(editor.saveButton).toHaveText(/Saving…/);
    await expect(editor.name).toHaveAttribute('readonly', '');
    await editor.pressEscape();
    await expect(editor.dialog).toBeVisible();
    release();
    await expect(editor.dialog).toHaveCount(0);
  });

  test('a listing that is gone says so and the list shows what is left', async ({ page, api }) => {
    const listings = answerListings(api, CAST_LISTINGS, {
      refuse: () => ({ status: 404, json: { code: 'service_not_found' } }),
    });
    const services = new ManageServicesPage(page);
    const editor = new ListingEditorDialog(page);
    await services.open();
    await services.editButton('Danielle Okafor').click();
    listings.current.splice(0, 1);

    await editor.save();

    await expect(editor.dialog).toHaveCount(0);
    await expect(services.toastTitle).toHaveText("That listing isn't there any more");
    await expect(services.listingRows).toHaveCount(4);
  });

  // L2-019 AC5: a Moderator is shown "Admins only"; listings are never asked for.
  test('a Moderator opening Services sees Admins only, not the listings', async ({ page, api }) => {
    api.on('GET', '/api/admin/session', () => ({ json: MODERATOR_SIGNED_IN }));
    api.on('GET', LISTINGS, () => adminListings(CAST_LISTINGS));
    const services = new ManageServicesPage(page);

    await services.open();

    await expect(services.heading).toHaveText('Admins only');
    await expect(services.listingRows).toHaveCount(0);
  });
});
