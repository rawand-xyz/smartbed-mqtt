import { IMQTTConnection } from '@mqtt/IMQTTConnection';
import { mocked, testDevice } from '@utils/testHelpers';
import { mock } from 'jest-mock-extended';
import { getSnoreRelief } from 'Sleeptracker/requests/getSnoreRelief';
import { setSnoreRelief } from 'Sleeptracker/requests/setSnoreRelief';
import { Bed } from 'Sleeptracker/types/Bed';
import { Controller } from 'Sleeptracker/types/Controller';
import { processSnoreReliefSwitches } from './snoreReliefSwitches';

jest.mock('Sleeptracker/requests/getSnoreRelief');
jest.mock('Sleeptracker/requests/setSnoreRelief');

const mqtt = mock<IMQTTConnection>();
const user = { email: 'email', password: 'password' };
const bed = { deviceData: testDevice } as unknown as Bed;
const controller = { user, sideName: 'Left', entities: {} } as unknown as Controller;

describe(processSnoreReliefSwitches.name, () => {
  beforeAll(() => jest.useFakeTimers());

  it('sends a switch command to the API and publishes the new state', async () => {
    const handlers: Record<string, (message: string) => Promise<void>> = {};
    mocked(mqtt.on).mockImplementation((topic, func) => (handlers[topic] = func));
    mocked(getSnoreRelief)
      .mockResolvedValueOnce({ snoreReliefTilt: false, snoreReliefVibration: false })
      .mockResolvedValueOnce({ snoreReliefTilt: true, snoreReliefVibration: false });
    mocked(setSnoreRelief).mockResolvedValue(true);

    await processSnoreReliefSwitches(mqtt, bed, controller);
    await handlers['device_topic/snore_relief_tilt_left/command']('ON');
    jest.runAllTimers();

    expect(setSnoreRelief).toHaveBeenCalledWith({ snoreReliefTilt: true, snoreReliefVibration: false }, user);
    expect(getSnoreRelief).toHaveBeenCalledTimes(2);
    expect(mqtt.publish).toHaveBeenCalledWith('device_topic/snore_relief_tilt_left/state', 'ON');
  });
});
