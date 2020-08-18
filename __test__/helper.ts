import { DriverInterface } from '../src';

export enum StorageName {
  user = 'user',
  no = 'no',
  enable = 'enable',
  data = 'data',
}
export const defaults = {
  [StorageName.user]: 'guest',
  [StorageName.no]: -1,
  [StorageName.enable]: false,
  [StorageName.data]: {},
};
export const defLen = 4;

let saved: { [name: string]: any } = {};
export function restoreSaved() {
  saved = {
    [StorageName.user]: 'user001',
    [StorageName.no]: 123,
    [StorageName.data]: { name: 'John', age: 12 },
  };
}
export function clearSaved() {
  saved = {};
}
export function getSaved(name: string) {
  return saved[name];
}
export function setSaved(name: string, value: any) {
  saved[name] = value;
}

export class AsyncDriver implements DriverInterface {
  async getItem(name: string) {
    await delay(100);
    return getSaved(name) ? getSaved(name) : null;
  }

  async setItem(name: string, value: string) {
    await delay(100);
    setSaved(name, value);
  }
}

function delay(t: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, t);
  });
}
