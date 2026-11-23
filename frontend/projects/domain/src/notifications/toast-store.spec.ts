import { TOAST_LIFETIME_MS, TOAST_LIMIT, ToastStore } from './toast-store';

// ADR 0015: a toast leaves by itself after about 6 seconds, Dismiss removes it at once, at most
// three show, and the store's timers end with its screen. A fake clock moves time; nothing sleeps.
describe('ToastStore', () => {
  let store: ToastStore;

  beforeEach(() => {
    vi.useFakeTimers();
    store = new ToastStore();
  });

  afterEach(() => {
    store.ngOnDestroy();
    vi.useRealTimers();
  });

  const titles = (): string[] => store.toasts().map((toast) => toast.title);

  it('shows a toast with its title and text', () => {
    store.show('Draft saved', "Whole Life Retreat isn't visible to members yet.");

    expect(store.toasts()).toEqual([
      { id: 1, title: 'Draft saved', text: "Whole Life Retreat isn't visible to members yet." },
    ]);
  });

  it('keeps a toast until its 6 seconds are up, then lets it go', () => {
    expect(TOAST_LIFETIME_MS).toBe(6_000);
    store.show('Draft saved', 'One');

    vi.advanceTimersByTime(5_999);
    expect(titles()).toEqual(['Draft saved']);
    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);
  });

  it('times each toast from when it showed', () => {
    store.show('First', '');
    vi.advanceTimersByTime(3_000);
    store.show('Second', '');

    vi.advanceTimersByTime(3_000);
    expect(titles()).toEqual(['Second']);
    vi.advanceTimersByTime(3_000);
    expect(titles()).toEqual([]);
  });

  it('removes a dismissed toast at once and forgets its timer', () => {
    store.show('First', '');
    store.show('Second', '');

    store.dismiss(1);

    expect(titles()).toEqual(['Second']);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('dismissing a toast that has gone changes nothing', () => {
    store.show('First', '');
    store.dismiss(7);
    expect(titles()).toEqual(['First']);
  });

  it(`shows at most ${TOAST_LIMIT}: a fourth pushes the oldest out with its timer`, () => {
    expect(TOAST_LIMIT).toBe(3);
    for (const title of ['One', 'Two', 'Three', 'Four']) store.show(title, '');

    expect(titles()).toEqual(['Two', 'Three', 'Four']);
    expect(vi.getTimerCount()).toBe(3);
  });

  it('ends every timer when its screen goes', () => {
    store.show('One', '');
    store.show('Two', '');

    store.ngOnDestroy();

    expect(vi.getTimerCount()).toBe(0);
    expect(titles()).toEqual([]);
  });
});
