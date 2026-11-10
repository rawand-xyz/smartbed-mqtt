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

  it('sends a switch command to the API and publishes the result', async () => {
    const handlers: Record<string, (message: string) => Promise<void>> = {};
    mocked(mqtt.on).mockImplementation((topic, func) => (handlers[topic] = func));
    mocked(getSnoreRelief).mockResolvedValue({ snoreReliefTilt: false, snoreReliefVibration: false });
    mocked(setSnoreRelief).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await processSnoreReliefSwitches(mqtt, bed, controller);
    await handlers['device_topic/snore_relief_tilt_left/command']('ON');
    jest.runAllTimers();

    expect(setSnoreRelief).toHaveBeenCalledWith({ snoreReliefTilt: true, snoreReliefVibration: false }, user);
    expect(mqtt.publish).toHaveBeenCalledWith('device_topic/snore_relief_tilt_left/state', 'ON');

    await handlers['device_topic/snore_relief_vibration_left/command']('ON');
    jest.runAllTimers();

    // The API refused the change, so the switch keeps its old state.
    expect(setSnoreRelief).toHaveBeenLastCalledWith({ snoreReliefTilt: true, snoreReliefVibration: true }, user);
    expect(mqtt.publish).not.toHaveBeenCalledWith('device_topic/snore_relief_vibration_left/state', 'ON');
  });
});
