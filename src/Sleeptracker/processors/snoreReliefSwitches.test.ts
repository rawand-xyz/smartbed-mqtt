import { IMQTTConnection } from '@mqtt/IMQTTConnection';
import { mocked, testDevice } from '@utils/testHelpers';
import { mock } from 'jest-mock-extended';
import { getSnoreRelief } from 'Sleeptracker/requests/getSnoreRelief';
import { setSnoreRelief } from 'Sleeptracker/requests/setSnoreRelief';
import { Bed } from 'Sleeptracker/types/Bed';
import { Controller } from 'Sleeptracker/types/Controller';
import { SnoreRelief } from 'Sleeptracker/types/SnoreRelief';
import { processSnoreReliefSwitches } from './snoreReliefSwitches';

jest.mock('Sleeptracker/requests/getSnoreRelief');
jest.mock('Sleeptracker/requests/setSnoreRelief');

const mqtt = mock<IMQTTConnection>();
const user = { email: 'email', password: 'password' };
const bed = { deviceData: testDevice } as unknown as Bed;
let controller: Controller;

const topic = (name: string, suffix: string) => `device_topic/snore_relief_${name}_left/${suffix}`;

describe(processSnoreReliefSwitches.name, () => {
  let handlers: Record<string, (message: string) => Promise<void>>;

  beforeAll(() => jest.useFakeTimers());
  beforeEach(async () => {
    jest.resetAllMocks();
    handlers = {};
    mocked(mqtt.on).mockImplementation((topic, func) => (handlers[topic] = func));
    mocked(getSnoreRelief).mockResolvedValue({ snoreReliefTilt: false, snoreReliefVibration: false });
    controller = { user, sideName: 'Left', entities: {} } as unknown as Controller;
    await processSnoreReliefSwitches(mqtt, bed, controller);
  });

  it('sends a switch command to the API and publishes the new state', async () => {
    mocked(setSnoreRelief).mockResolvedValue(true);

    await handlers[topic('tilt', 'command')]('ON');
    jest.runAllTimers();

    expect(setSnoreRelief).toHaveBeenCalledWith({ snoreReliefTilt: true, snoreReliefVibration: false }, user);
    expect(mqtt.publish).toHaveBeenCalledWith(topic('tilt', 'state'), 'ON');
  });

  it('keeps the old state when the API refuses the change', async () => {
    mocked(setSnoreRelief).mockResolvedValue(false);

    await handlers[topic('vibration', 'command')]('OFF');
    await handlers[topic('vibration', 'command')]('ON');
    jest.runAllTimers();

    expect(mqtt.publish).not.toHaveBeenCalledWith(topic('vibration', 'state'), 'ON');
  });

  it('does not let a refresh that started before a change undo it', async () => {
    mocked(setSnoreRelief).mockResolvedValue(true);
    let finishRead: (value: SnoreRelief) => void = () => {};
    mocked(getSnoreRelief).mockReturnValueOnce(new Promise((resolve) => (finishRead = resolve)));

    const refresh = processSnoreReliefSwitches(mqtt, bed, controller);
    const change = handlers[topic('tilt', 'command')]('ON');
    finishRead({ snoreReliefTilt: false, snoreReliefVibration: false });
    await Promise.all([refresh, change]);
    await handlers[topic('vibration', 'command')]('ON');

    expect(setSnoreRelief).toHaveBeenLastCalledWith({ snoreReliefTilt: true, snoreReliefVibration: true }, user);
  });

  it('sends two quick changes one after the other, each on top of the last', async () => {
    mocked(setSnoreRelief).mockResolvedValue(true);

    await Promise.all([handlers[topic('tilt', 'command')]('ON'), handlers[topic('vibration', 'command')]('ON')]);

    expect(mocked(setSnoreRelief).mock.calls.map(([value]) => value)).toEqual([
      { snoreReliefTilt: true, snoreReliefVibration: false },
      { snoreReliefTilt: true, snoreReliefVibration: true },
    ]);
  });
});
