import eachSeries from 'p-each-series';
import autoBind from 'auto-bind';

export type DriverInterface = {
  getItem: (key: any) => any;
  setItem: (key: any, value: any) => any;
};

export class StrictAsyncStorage<
  TDefault extends { [key: string]: any },
  TKey extends string & keyof TDefault,
  TDriver extends DriverInterface = Storage
> {
  protected _defaults: TDefault;
  protected _driver: TDriver | Storage;
  protected _map = new Map();

  protected _initialized = false;
  get initialized() {
    return this._initialized;
  }

  protected _disposed = false;
  get disposed() {
    return this._disposed;
  }

  protected setInitialized() {
    this._initialized = true;
  }
  protected setDisposed() {
    this._disposed = true;
  }

  constructor(defaults: TDefault, driver: TDriver | Storage = localStorage) {
    this._defaults = defaults;
    this._driver = driver;

    autoBind(this);
  }

  async initialize() {
    if (this._initialized) {
      throw new Error(
        '[strict-async-storage] Invalid operation. This has been initialized.'
      );
    }

    await eachSeries(
      Object.keys(this._defaults) as TKey[],
      async (key: TKey) => {
        const value = await this._driver.getItem(key);
        this.setMap(key, value === null ? Jclone(this._defaults[key]) : value);
      }
    );

    this.setInitialized();
  }

  getItem<T extends keyof TDefault & string>(key: T): TDefault[T] {
    this.enable();
    this.valid(key);

    return this._map.get(key);
  }

  protected setMap(key: any, value: any) {
    this._map.set(key, value);
  }
  protected batchMap(map: Map<any, any>) {
    map.forEach((value, key) => {
      this._map.set(key, value);
    });
  }

  async setItem<T extends keyof TDefault & string>(key: T, value: TDefault[T]) {
    this.enable();
    this.valid(key);

    if ((await this.getItem(key)) === value) return;
    if (value === null) value = this._defaults[key];

    await this._driver.setItem(key, value);
    this.setMap(key, value);
  }

  async resetItem<T extends keyof TDefault & string>(key: T) {
    this.enable();
    this.valid(key);

    await this.setItem(key, this._defaults[key]);
    return this.getItem(key);
  }

  async resetAll() {
    this.enable();

    const map = new Map();
    await eachSeries(Object.keys(this._defaults) as TKey[], async (key) => {
      await this._driver.setItem(key, this._defaults[key]);
      map.set(key, this._defaults[key]);
    });

    this.batchMap(map);
    map.clear();
  }

  get length() {
    this.enable();
    return this._map.size;
  }

  dispose() {
    if (this._disposed) {
      throw new Error(
        '[strict-async-storage] Invalid operation. This has been disposed.'
      );
    }

    //@ts-expect-error
    this._defaults = undefined;
    this._map.clear();
    //@ts-expect-error
    this._map = undefined;
    //@ts-expect-error
    this._driver = undefined;

    this.setDisposed();
  }

  get defaults() {
    return this._defaults;
  }

  hasItem(key: any) {
    this.enable();
    return this._map.has(key);
  }

  protected enable() {
    if (!this._initialized || this._disposed) {
      throw new Error(
        '[strict-async-storage] Invalid operation. Not initialized yet, failed to initialize or has been disposed.'
      );
    }
  }

  protected valid(key: any) {
    if (!this.hasItem(key))
      throw new RangeError(
        '[strict-async-storage] The key parameter is an invalid value. Not initialized yet, failed to initialize or has been disposed.'
      );
  }
}

function Jclone(src: any) {
  return JSON.parse(JSON.stringify(src));
}
