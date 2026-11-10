import { IMQTTConnection } from '@mqtt/IMQTTConnection';
import { SnoreReliefSwitchSet } from '../entities/SnoreReliefSwitchSet';
import { getSnoreRelief } from '../requests/getSnoreRelief';
import { setSnoreRelief } from '../requests/setSnoreRelief';
import { Bed } from '../types/Bed';
import { Controller } from '../types/Controller';

export const processSnoreReliefSwitches = async (
  mqtt: IMQTTConnection,
  { deviceData }: Bed,
  { user, sideName, entities }: Controller
) => {
  const cache = entities as { snoreReliefSwitchSet?: SnoreReliefSwitchSet };
  if (cache.snoreReliefSwitchSet) return cache.snoreReliefSwitchSet.refresh(() => getSnoreRelief(user));

  const snoreRelief = await getSnoreRelief(user);
  if (!snoreRelief) return;
  cache.snoreReliefSwitchSet = new SnoreReliefSwitchSet(mqtt, deviceData, sideName, (newSnoreRelief) =>
    setSnoreRelief(newSnoreRelief, user)
  );
  cache.snoreReliefSwitchSet.setState(snoreRelief);
};
