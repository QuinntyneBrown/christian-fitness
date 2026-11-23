/** How much of an event's capacity is taken, as the registrations page words it (mock `admin-event-registrations`; ADR 0036). */
export interface CapacityUsed {
  /** "Capacity used: 38 of 50 going". */
  label: string;
  /** Whole percent from 0 to 100; 0 when the event holds nobody. */
  percent: number;
}

/** `going` of `capacity` places taken. */
export function capacityUsed(going: number, capacity: number): CapacityUsed {
  const percent = capacity > 0 ? Math.min(100, Math.round((going * 100) / capacity)) : 0;
  return { label: `Capacity used: ${going} of ${capacity} going`, percent };
}
