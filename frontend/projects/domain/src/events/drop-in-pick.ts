/** Where the member is with picking dates: how many are ticked, and whether a change or a save waits. */
export interface DropInPickState {
  /** How many dates are ticked. */
  picked: number;
  /** Changing dates already held ("Change dates"), not registering new ones. */
  changing?: boolean;
  /** While changing: the ticks differ from the dates held. */
  changed?: boolean;
  /** The registration or the change waits on the API. */
  busy?: boolean;
}

/** The drop-in option's note and the panel's button. */
export interface DropInPickView {
  note: string;
  button: { label: string; disabled: boolean; busy: boolean };
}

/**
 * The drop-in option's note and the panel's button (L2-053 AC1, AC3, AC4; ADR 0102): "Tick dates in
 * the list" or "<n> picked below"; "Pick a date first", disabled until a date is ticked, then
 * "Register for 1 date" or "Register for <n> dates" ("Registering…" while it waits). While changing
 * dates the button reads "Save dates", disabled until the ticks differ from what is held, so every
 * date can be unticked and saved ("Saving…" while it waits).
 */
export function dropInPickOf(state: DropInPickState): DropInPickView {
  const { picked, changing = false, changed = false, busy = false } = state;
  const note = picked === 0 ? 'Tick dates in the list' : `${picked} picked below`;
  if (changing) {
    return {
      note,
      button: { label: busy ? 'Saving…' : 'Save dates', disabled: busy || !changed, busy },
    };
  }
  if (busy) return { note, button: { label: 'Registering…', disabled: true, busy: true } };
  return {
    note,
    button:
      picked === 0
        ? { label: 'Pick a date first', disabled: true, busy: false }
        : {
            label: `Register for ${picked} ${picked === 1 ? 'date' : 'dates'}`,
            disabled: false,
            busy: false,
          },
  };
}
