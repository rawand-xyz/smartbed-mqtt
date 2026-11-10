import { describeExpiry } from './getAuthHeader';

describe(describeExpiry.name, () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterAll(() => jest.useRealTimers());

  it.each([
    [1767225600 + 3600, 'looks like an epoch: token valid for ~60 min'],
    [3600, 'looks like a lifetime: token valid for ~60 min'],
    ['3600', 'is not a number (string)'],
  ])('classifies %p', (value, expected) => {
    expect(describeExpiry(value)).toEqual(`[Sleeptracker] Auth token expirationTimeSecs ${expected}`);
  });
});
