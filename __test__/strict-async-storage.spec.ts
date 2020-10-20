import { StrictAsyncStorage, DriverInterface } from '../src';
import {
  getSaved,
  setSaved,
  defaults,
  AsyncDriver,
  StorageName,
  restoreSaved,
  defLen,
} from './helper';
import { autorun, configure, makeObservable, action, observable } from 'mobx';

describe('strict-async-storage', () => {
  jest
    .spyOn(Object.getPrototypeOf(localStorage) as Storage, 'getItem')
    .mockImplementation((name: string) => {
      return getSaved(name) ? getSaved(name) : null;
    });
  jest
    .spyOn(Object.getPrototypeOf(localStorage) as Storage, 'setItem')
    .mockImplementation((name: string, value: string) => {
      setSaved(name, value);
    });

  runTest('sync driver', new StrictAsyncStorage(defaults));

  runTest('async driver', new StrictAsyncStorage(defaults, new AsyncDriver()));

  describe('mobx', () => {
    configure({
      enforceActions: 'always',
      computedRequiresReaction: true,
      reactionRequiresObservable: true,
      // observableRequiresReaction: true,
      // disableErrorBoundaries: true,
    });

    let storage: StrictAsyncStorage<
      {
        user: string;
        no: number;
        enable: boolean;
        data: {};
      },
      StorageName,
      AsyncDriver
    >;
    let view: jest.Mock;

    beforeEach(async () => {
      restoreSaved();

      storage = makeObservable(
        new StrictAsyncStorage(defaults, new AsyncDriver()),
        {
          //@ts-expect-error
          _map: observable,
          _initialized: observable,
          _disposed: observable,
          setMap: action,
          batchMap: action,
          setInitialized: action,
          dispose: action,
        }
      );
      await storage.initialize();

      view = jest.fn(() => {
        try {
          return `user:${storage.getItem(
            StorageName.user
          )},no:${storage.getItem(StorageName.no)},enable:${storage.getItem(
            StorageName.enable
          )},data:${storage.getItem(StorageName.data)},`;
        } catch (error) {
          return error;
        }
      });

      autorun(view);
      view.mockClear();
    });

    it('test setItem', async () => {
      const user = 'test001';
      await storage.setItem(StorageName.user, user);
      expect(view).toBeCalledTimes(1);
      expect(view).lastReturnedWith(
        `user:${user},no:${123},enable:${defaults[StorageName.enable]},data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await storage.setItem(StorageName.user, undefined as any);
      expect(view).toBeCalledTimes(2);
      expect(view).lastReturnedWith(
        `user:${undefined},no:${123},enable:${
          defaults[StorageName.enable]
        },data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await storage.setItem(StorageName.user, null as any);
      expect(view).toBeCalledTimes(3);
      expect(view).lastReturnedWith(
        `user:${defaults[StorageName.user]},no:${123},enable:${
          defaults[StorageName.enable]
        },data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await expect(
        storage.setItem('other' as any, null as any)
      ).rejects.toThrowError(RangeError);
      expect(view).toBeCalledTimes(3);
    });

    it('test resetItem', async () => {
      await storage.resetItem(StorageName.no);
      expect(view).toBeCalledTimes(1);
      expect(view).lastReturnedWith(
        `user:${'user001'},no:${defaults[StorageName.no]},enable:${
          defaults[StorageName.enable]
        },data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await expect(storage.resetItem('other' as any)).rejects.toThrowError(
        RangeError
      );
      expect(view).toBeCalledTimes(1);
    });

    it('test resetAll', async () => {
      await storage.resetAll();
      expect(view).toBeCalledTimes(1);
      expect(view).lastReturnedWith(
        `user:${defaults[StorageName.user]},no:${
          defaults[StorageName.no]
        },enable:${defaults[StorageName.enable]},data:${
          defaults[StorageName.data]
        },`
      );
    });

    it('test dispose', async () => {
      await storage.dispose();
      expect(view).lastReturnedWith(
        new Error(
          '[strict-async-storage] Invalid operation. Not initialized yet, failed to initialize or has been disposed.'
        )
      );
    });
  });
});

function runTest<TDriver extends DriverInterface = Storage>(
  testName: string | number | Function | jest.FunctionLike,
  storage: StrictAsyncStorage<typeof defaults, StorageName, TDriver>
) {
  describe(testName, () => {
    restoreSaved();

    it('test initialize', async () => {
      expect(storage.initialized).toBeFalsy();
      await storage.initialize();
      expect(storage.initialized).toBeTruthy();
      expect(storage.defaults).toEqual(defaults);

      await expect(async () => await storage.initialize()).rejects.toThrowError(
        '[strict-async-storage] Invalid operation. This has been initialized.'
      );
    });

    it('test length', async () => {
      expect(await storage.length).toBe(defLen);
    });

    it('test getItem', () => {
      expect(storage.getItem(StorageName.user)).toBe(
        getSaved(StorageName.user)
      );
      expect(storage.getItem(StorageName.no)).toBe(getSaved(StorageName.no));
      expect(storage.getItem(StorageName.enable)).toBe(
        defaults[StorageName.enable]
      );
      expect(storage.getItem(StorageName.data)).toEqual(
        getSaved(StorageName.data)
      );

      expect(() => storage.getItem('other' as any)).toThrowError(RangeError);
    });

    it('test setItem', async () => {
      const user = 'test001';
      await storage.setItem(StorageName.user, user);
      expect(storage.getItem(StorageName.user)).toBe(user);

      await storage.setItem(StorageName.user, undefined as any);
      expect(storage.getItem(StorageName.user)).toBeUndefined();
      await storage.setItem(StorageName.user, null as any);
      expect(storage.getItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );

      await expect(
        storage.setItem('other' as any, null as any)
      ).rejects.toThrowError(RangeError);
    });

    it('test resetItem', async () => {
      expect(await storage.resetItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );
      expect(storage.getItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );

      await expect(storage.resetItem('other' as any)).rejects.toThrowError(
        RangeError
      );
    });

    it('test resetAll', async () => {
      await storage.resetAll();

      expect(storage.getItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );
      expect(storage.getItem(StorageName.no)).toBe(defaults[StorageName.no]);
      expect(storage.getItem(StorageName.enable)).toBe(
        defaults[StorageName.enable]
      );
      expect(storage.getItem(StorageName.data)).toEqual(
        defaults[StorageName.data]
      );
    });

    it('test dispose', () => {
      expect(storage.disposed).toBeFalsy();
      storage.dispose();
      expect(storage.disposed).toBeTruthy();
      expect(() => storage.dispose()).toThrowError(
        '[strict-async-storage] Invalid operation. This has been disposed.'
      );

      expect(() => storage.length).toThrowError(
        '[strict-async-storage] Invalid operation. Not initialized yet, failed to initialize or has been disposed.'
      );
      expect(() => storage.getItem(StorageName.user)).toThrowError(
        '[strict-async-storage] Invalid operation. Not initialized yet, failed to initialize or has been disposed.'
      );
    });
  });
}
