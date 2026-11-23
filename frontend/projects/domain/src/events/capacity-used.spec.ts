import { capacityUsed } from './capacity-used';

// ADR 0036: the registrations page words capacity used and fills its bar, one row per case.
describe('capacityUsed', () => {
  it.each([
    { going: 0, capacity: 50, label: 'Capacity used: 0 of 50 going', percent: 0 },
    { going: 3, capacity: 50, label: 'Capacity used: 3 of 50 going', percent: 6 },
    { going: 17, capacity: 25, label: 'Capacity used: 17 of 25 going', percent: 68 },
    { going: 1, capacity: 3, label: 'Capacity used: 1 of 3 going', percent: 33 },
    { going: 30, capacity: 30, label: 'Capacity used: 30 of 30 going', percent: 100 },
    { going: 5, capacity: 0, label: 'Capacity used: 5 of 0 going', percent: 0 },
  ])('$going of $capacity reads $label at $percent%', ({ going, capacity, label, percent }) => {
    expect(capacityUsed(going, capacity)).toEqual({ label, percent });
  });
});
