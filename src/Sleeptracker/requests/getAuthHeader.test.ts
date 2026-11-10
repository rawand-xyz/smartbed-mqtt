jest.mock('@utils/logger');

// Each test loads fresh modules, because logExpiryFormat logs only once per process.
const load = async () => {
  jest.resetModules();
  const { logInfo } = await import('@utils/logger');
  const { logExpiryFormat } = await import('./getAuthHeader');
  return { logInfo, logExpiryFormat };
};

describe('logExpiryFormat', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterAll(() => jest.useRealTimers());

  it.each([
    [1767225600 + 3600, 'looks like an epoch: token valid for ~60 min'],
    [3600, 'looks like a lifetime: token valid for ~60 min'],
    ['3600', 'is not a number (string)'],
  ])('classifies %p', async (value, expected) => {
    const { logInfo, logExpiryFormat } = await load();
    logExpiryFormat(value);
    expect(logInfo).toHaveBeenCalledWith(`[Sleeptracker] Auth token expirationTimeSecs ${expected}`);
  });

  it('logs only once', async () => {
    const { logInfo, logExpiryFormat } = await load();
    logExpiryFormat(3600);
    logExpiryFormat(3600);
    expect(logInfo).toHaveBeenCalledTimes(1);
  });
});
