import { IMQTTConnection } from '@mqtt/IMQTTConnection';
import { SnoreReliefSwitchSet } from '../entities/SnoreReliefSwitchSet';
import { getSnoreRelief } from '../requests/getSnoreRelief';
import { setSnoreRelief } from '../requests/setSnoreRelief';
import { Bed } from '../types/Bed';
import { Controller } from '../types/Controller';
import { SnoreRelief } from '../types/SnoreRelief';

export const processSnoreReliefSwitches = async (
  mqtt: IMQTTConnection,
  { deviceData }: Bed,
  { user, sideName, entities }: Controller
) => {
  const cache = entities as { snoreReliefSwitchSet?: SnoreReliefSwitchSet };
  const snoreRelief = await getSnoreRelief(user);
  if (!snoreRelief) return;

  if (!cache.snoreReliefSwitchSet) {
    const switchSet = new SnoreReliefSwitchSet(mqtt, deviceData, sideName, async (newSnoreRelief: SnoreRelief) => {
      if (!(await setSnoreRelief(newSnoreRelief, user))) return;
      switchSet.setState(await getSnoreRelief(user));
    });
    cache.snoreReliefSwitchSet = switchSet;
  }
  cache.snoreReliefSwitchSet.setState(snoreRelief);
};
