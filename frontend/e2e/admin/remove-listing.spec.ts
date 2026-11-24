import { answerListings, CAST_LISTINGS } from '../fixtures/admin-listings';
import { expect, test } from '../fixtures/test';
import { ManageServicesPage } from '../page-objects/admin/manage-services.page';
import { RemoveListingDialog } from '../page-objects/admin/remove-listing.dialog';

const [DANIELLE, MARCUS] = CAST_LISTINGS;

// L2-027 AC2 (slice 23.2; ADR 0000): staff remove a listing after confirming; it leaves the list.
test.describe('Admin app, removing a listing', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  // Mock remove-listing/default.
  test('Remove asks first, naming the professional, and Keep listing sends nothing', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);
    const dialog = new RemoveListingDialog(page);
    await services.open();

    await services.removeButton('Marcus Lee, RD').click();

    await expect(dialog.dialog).toBeVisible();
    await expect(dialog.subtitle).toHaveText('Marcus Lee, RD · Registered dietitian');
    await expect(dialog.text).toContainText(
      'Conversations they already have with this professional stay.',
    );
    await expect(dialog.keepButton).toBeFocused();

    await dialog.keepButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.listingRows).toHaveCount(5);
    await expect(services.removeButton('Marcus Lee, RD')).toBeFocused();
    expect(listings.removals).toEqual([]);
  });

  test('Escape and Close also keep the listing', async ({ page, api }) => {
    const listings = answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);
    const dialog = new RemoveListingDialog(page);
    await services.open();
    await services.removeButton('Danielle Okafor').click();
    await expect(dialog.keepButton).toBeFocused();

    await dialog.pressEscape();
    await expect(dialog.dialog).toHaveCount(0);
    await services.removeButton('Danielle Okafor').click();
    await expect(dialog.keepButton).toBeFocused();
    await dialog.closeButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(listings.removals).toEqual([]);
  });

  test('Remove listing sends the removal, closes, says so and the row leaves the list', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS);
    const services = new ManageServicesPage(page);
    const dialog = new RemoveListingDialog(page);
    await services.open();
    await services.removeButton('Danielle Okafor').click();

    await dialog.removeButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(listings.removals).toEqual([DANIELLE.id]);
    await expect(services.toastTitle).toHaveText('Listing removed');
    await expect(services.toastText).toHaveText(
      'Danielle Okafor is no longer on Services. Their conversations stay.',
    );
    await expect(services.listingRows).toHaveCount(4);
    await expect(services.removeButton('Danielle Okafor')).toHaveCount(0);
    await expect(services.listingsCount).toHaveText('4');
  });

  // Mock remove-listing/busy.
  test('while removing, the button reads Removing, both buttons hold still and Escape does not close it', async ({
    page,
    api,
  }) => {
    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    answerListings(api, CAST_LISTINGS, { holdRemove: gate });
    const services = new ManageServicesPage(page);
    const dialog = new RemoveListingDialog(page);
    await services.open();
    await services.removeButton('Marcus Lee, RD').click();

    await dialog.removeButton.click();

    await expect(dialog.removeButton).toHaveText(/Removing…/);
    await expect(dialog.removeButton).toBeDisabled();
    await expect(dialog.keepButton).toBeDisabled();
    await dialog.pressEscape();
    await expect(dialog.dialog).toBeVisible();
    release();
    await expect(dialog.dialog).toHaveCount(0);
  });

  // Mock remove-listing/failed.
  test('a removal that does not go through keeps the dialog with a message, and Remove again works', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS, {
      refuseRemove: (number) => (number === 0 ? { abort: true } : null),
    });
    const services = new ManageServicesPage(page);
    const dialog = new RemoveListingDialog(page);
    await services.open();
    await services.removeButton('Marcus Lee, RD').click();

    await dialog.removeButton.click();

    await expect(dialog.alert).toContainText("Couldn't remove the listing");
    await expect(dialog.alert).toContainText('It is still on Services. Try again in a moment.');

    await dialog.removeButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    expect(listings.removals).toEqual([MARCUS.id, MARCUS.id]);
    await expect(services.listingRows).toHaveCount(4);
  });

  test('a listing that is already gone says so and the list shows what is left', async ({
    page,
    api,
  }) => {
    const listings = answerListings(api, CAST_LISTINGS, {
      refuseRemove: () => ({ status: 404, json: { code: 'service_not_found' } }),
    });
    const services = new ManageServicesPage(page);
    const dialog = new RemoveListingDialog(page);
    await services.open();
    await services.removeButton('Danielle Okafor').click();
    listings.current.splice(0, 1);

    await dialog.removeButton.click();

    await expect(dialog.dialog).toHaveCount(0);
    await expect(services.toastTitle).toHaveText("That listing isn't there any more");
    await expect(services.listingRows).toHaveCount(4);
  });
});
