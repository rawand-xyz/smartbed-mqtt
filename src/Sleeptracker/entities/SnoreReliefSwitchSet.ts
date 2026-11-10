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

  // The API sets both values at once. Changes and refreshes run one after the other,
  // so each change starts from the last good state and a slow refresh cannot undo it.
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.queue.then(task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  // Returns the state after the change, or the old state if the API refused it.
  private change(update: Partial<SnoreRelief>) {
    return this.enqueue(async () => {
      const next = { ...this.state, ...update };
      if (await this.onChange(next)) this.state = next;
      return this.state;
    });
  }

  refresh(read: () => Promise<SnoreRelief | null>) {
    return this.enqueue(async () => {
      const state = await read();
      if (state) this.setState(state);
    });
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
