import { IDeviceData } from '@ha/IDeviceData';
import { Switch } from '@ha/Switch';
import { IStateful } from '@ha/base/IStateful';
import { IMQTTConnection } from '@mqtt/IMQTTConnection';
import { buildEntityConfig } from 'Sleeptracker/buildEntityConfig';
import { SnoreRelief } from '../types/SnoreRelief';

export class SnoreReliefSwitchSet implements IStateful<SnoreRelief> {
  private tilt: Switch;
  private vibration: Switch;
  private state: SnoreRelief = { snoreReliefTilt: false, snoreReliefVibration: false };
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    mqtt: IMQTTConnection,
    deviceData: IDeviceData,
    sideName: string,
    private onChange: (value: SnoreRelief) => Promise<boolean>
  ) {
    this.tilt = new Switch(
      mqtt,
      deviceData,
      buildEntityConfig('Snore Relief Tilt', sideName, 'config'),
      async (snoreReliefTilt) => (await this.change({ snoreReliefTilt })).snoreReliefTilt
    );
    this.vibration = new Switch(
      mqtt,
      deviceData,
      buildEntityConfig('Snore Relief Vibration', sideName, 'config'),
      async (snoreReliefVibration) => (await this.change({ snoreReliefVibration })).snoreReliefVibration
    );
  }

  // The API sets both values at once, so changes run one after the other, each on top of the last good state.
  // Returns the state after the change, or the old state if the API refused it.
  private change(update: Partial<SnoreRelief>): Promise<SnoreRelief> {
    const result = this.queue.then(async () => {
      const next = { ...this.state, ...update };
      if (await this.onChange(next)) this.state = next;
      return this.state;
    });
    this.queue = result.catch(() => undefined);
    return result;
  }

  setState(state: SnoreRelief | null): void {
    if (state === null) {
      this.tilt.setOffline();
      this.vibration.setOffline();
      return;
    }
    this.state = state;
    this.tilt.setState(state.snoreReliefTilt);
    this.vibration.setState(state.snoreReliefVibration);
  }

  getState(): SnoreRelief {
    return this.state;
  }
}
