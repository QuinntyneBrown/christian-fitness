import { dropInPickOf } from './drop-in-pick';

// L2-053 AC1, AC3 and AC4 (ADR 0102): the drop-in option's note and the panel's button while
// dates are picked, registered or changed, one case per row.
describe('dropInPickOf', () => {
  it.each([
    {
      why: 'nothing ticked: the button waits for a date',
      state: { picked: 0 },
      note: 'Tick dates in the list',
      button: { label: 'Pick a date first', disabled: true, busy: false },
    },
    {
      why: 'one date ticked',
      state: { picked: 1 },
      note: '1 picked below',
      button: { label: 'Register for 1 date', disabled: false, busy: false },
    },
    {
      why: 'two dates ticked, as the mock drop-in draws them',
      state: { picked: 2 },
      note: '2 picked below',
      button: { label: 'Register for 2 dates', disabled: false, busy: false },
    },
    {
      why: 'registering: busy and disabled',
      state: { picked: 2, busy: true },
      note: '2 picked below',
      button: { label: 'Registering…', disabled: true, busy: true },
    },
    {
      why: 'changing dates, nothing changed yet',
      state: { picked: 2, changing: true, changed: false },
      note: '2 picked below',
      button: { label: 'Save dates', disabled: true, busy: false },
    },
    {
      why: 'changing dates, one unticked',
      state: { picked: 1, changing: true, changed: true },
      note: '1 picked below',
      button: { label: 'Save dates', disabled: false, busy: false },
    },
    {
      why: 'changing dates, every date unticked can still be saved',
      state: { picked: 0, changing: true, changed: true },
      note: 'Tick dates in the list',
      button: { label: 'Save dates', disabled: false, busy: false },
    },
    {
      why: 'saving the change',
      state: { picked: 1, changing: true, changed: true, busy: true },
      note: '1 picked below',
      button: { label: 'Saving…', disabled: true, busy: true },
    },
  ])('$why', ({ state, note, button }) => {
    expect(dropInPickOf(state)).toEqual({ note, button });
  });
});
