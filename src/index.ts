import eachSeries from 'p-each-series';
import autoBind from 'auto-bind';
import { defaults as def } from 'custom-defaults';

export type MapInterface = {
  set: (key: any, value: any) => any;
  get: (key: any) => any;
  has: (key: any) => boolean;
  clear: () => any;
  size: number;
};

export type DriverInterface = {
  getItem: (key: any) => any;
  setItem: (key: any, value: any) => any;
};

export type StrictAsyncStorageOption<TDriver> = {
  map?: MapInterface | (() => MapInterface);
  driver?: TDriver | (() => TDriver);
};

export const defOption = {
  map: () => new Map(),
  driver: localStorage,
};

export class StrictAsyncStorage<
  TDefault extends { [key: string]: any },
  TKey extends string & keyof TDefault,
  TDriver extends DriverInterface = Storage
> {
  protected _defaults: TDefault;
  protected _map: MapInterface;
  protected _driver: TDriver | Storage;
  constructor(
    defaults: TDefault,
    option:
      | StrictAsyncStorageOption<TDriver>
      | StrictAsyncStorageOption<Storage> = defOption
  ) {
    this._defaults = defaults;

    const opt = def(option, defOption);
    if (typeof opt.map === 'function') {
      this._map = opt.map();
    } else {
      this._map = opt.map;
    }

    if (typeof opt.driver === 'function') {
      this._driver = opt.driver();
    } else {
      this._driver = opt.driver;
    }

    autoBind(this);
  }

  protected setMap(key: string, value: any) {
    this._map.set(key, value);
  }

  async init() {
    await eachSeries(
      Object.keys(this._defaults) as TKey[],
      async (key: TKey) => {
        const value = await this._driver.getItem(key);
        this.setMap(key, value === null ? Jclone(this._defaults[key]) : value);
      }
    );
  }

  getItem<T extends keyof TDefault & string>(key: T): TDefault[T] {
    if (!this._map.has(key))
      throw new RangeError('The key parameter is an invalid value');

    return this._map.get(key);
  }

  async setItem<T extends keyof TDefault & string>(key: T, value: TDefault[T]) {
    if (!this._map.has(key))
      throw new RangeError('The key parameter is an invalid value');

    if ((await this.getItem(key)) === value) return;
    if (value === null) value = this._defaults[key];

    await this._driver.setItem(key, value);
    this.setMap(key, value);
  }

  async resetItem<T extends keyof TDefault & string>(key: T) {
    if (!this._map.has(key))
      throw new RangeError('The key parameter is an invalid value');

    await this.setItem(key, this._defaults[key]);
    return this.getItem(key);
  }

  async resetAll() {
    await eachSeries(Object.keys(this._defaults) as TKey[], this.resetItem);
  }

  get length() {
    return this._map.size;
  }

  dispose(handler?: (driver: TDriver | Storage) => void) {
    this._map.clear();
    if (handler) handler(this._driver);
  }
}

function Jclone(src: any) {
  return JSON.parse(JSON.stringify(src));
}
