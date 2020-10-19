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

    let strictAsyncStorage: StrictAsyncStorage<
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

      strictAsyncStorage = makeObservable(
        new StrictAsyncStorage(defaults, new AsyncDriver()),
        {
          //@ts-expect-error
          _map: observable,
          _initialized: observable,
          _disposed: observable,
          setMap: action,
          batchMap: action,
          setInitialized: action,
          setDisposed: action,
        }
      );
      await strictAsyncStorage.initialize();

      view = jest.fn(() => {
        try {
          return `user:${strictAsyncStorage.getItem(
            StorageName.user
          )},no:${strictAsyncStorage.getItem(
            StorageName.no
          )},enable:${strictAsyncStorage.getItem(
            StorageName.enable
          )},data:${strictAsyncStorage.getItem(StorageName.data)},`;
        } catch (error) {
          return error;
        }
      });

      autorun(view);
      view.mockClear();
    });

    it('test setItem', async () => {
      const user = 'test001';
      await strictAsyncStorage.setItem(StorageName.user, user);
      expect(view).toBeCalledTimes(1);
      expect(view).lastReturnedWith(
        `user:${user},no:${123},enable:${defaults[StorageName.enable]},data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await strictAsyncStorage.setItem(StorageName.user, undefined as any);
      expect(view).toBeCalledTimes(2);
      expect(view).lastReturnedWith(
        `user:${undefined},no:${123},enable:${
          defaults[StorageName.enable]
        },data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await strictAsyncStorage.setItem(StorageName.user, null as any);
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
        strictAsyncStorage.setItem('other' as any, null as any)
      ).rejects.toThrowError(RangeError);
      expect(view).toBeCalledTimes(3);
    });

    it('test resetItem', async () => {
      await strictAsyncStorage.resetItem(StorageName.no);
      expect(view).toBeCalledTimes(1);
      expect(view).lastReturnedWith(
        `user:${'user001'},no:${defaults[StorageName.no]},enable:${
          defaults[StorageName.enable]
        },data:${{
          name: 'John',
          age: 12,
        }},`
      );

      await expect(
        strictAsyncStorage.resetItem('other' as any)
      ).rejects.toThrowError(RangeError);
      expect(view).toBeCalledTimes(1);
    });

    it('test resetAll', async () => {
      await strictAsyncStorage.resetAll();
      expect(view).toBeCalledTimes(1);
      expect(view).lastReturnedWith(
        `user:${defaults[StorageName.user]},no:${
          defaults[StorageName.no]
        },enable:${defaults[StorageName.enable]},data:${
          defaults[StorageName.data]
        },`
      );
    });
  });
});

function runTest<TDriver extends DriverInterface = Storage>(
  testName: string | number | Function | jest.FunctionLike,
  strictAsyncStorage: StrictAsyncStorage<typeof defaults, StorageName, TDriver>
) {
  describe(testName, () => {
    restoreSaved();

    it('test initialize', async () => {
      expect(strictAsyncStorage.initialized).toBeFalsy();
      await strictAsyncStorage.initialize();
      expect(strictAsyncStorage.initialized).toBeTruthy();
      expect(strictAsyncStorage.defaults).toEqual(defaults);

      await expect(
        async () => await strictAsyncStorage.initialize()
      ).rejects.toThrowError(
        '[strict-async-storage] Invalid operation. This has been initialized.'
      );
    });

    it('test length', async () => {
      expect(await strictAsyncStorage.length).toBe(defLen);
    });

    it('test getItem', () => {
      expect(strictAsyncStorage.getItem(StorageName.user)).toBe(
        getSaved(StorageName.user)
      );
      expect(strictAsyncStorage.getItem(StorageName.no)).toBe(
        getSaved(StorageName.no)
      );
      expect(strictAsyncStorage.getItem(StorageName.enable)).toBe(
        defaults[StorageName.enable]
      );
      expect(strictAsyncStorage.getItem(StorageName.data)).toEqual(
        getSaved(StorageName.data)
      );

      expect(() => strictAsyncStorage.getItem('other' as any)).toThrowError(
        RangeError
      );
    });

    it('test setItem', async () => {
      const user = 'test001';
      await strictAsyncStorage.setItem(StorageName.user, user);
      expect(strictAsyncStorage.getItem(StorageName.user)).toBe(user);

      await strictAsyncStorage.setItem(StorageName.user, undefined as any);
      expect(strictAsyncStorage.getItem(StorageName.user)).toBeUndefined();
      await strictAsyncStorage.setItem(StorageName.user, null as any);
      expect(strictAsyncStorage.getItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );

      await expect(
        strictAsyncStorage.setItem('other' as any, null as any)
      ).rejects.toThrowError(RangeError);
    });

    it('test resetItem', async () => {
      expect(await strictAsyncStorage.resetItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );
      expect(strictAsyncStorage.getItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );

      await expect(
        strictAsyncStorage.resetItem('other' as any)
      ).rejects.toThrowError(RangeError);
    });

    it('test resetAll', async () => {
      await strictAsyncStorage.resetAll();

      expect(strictAsyncStorage.getItem(StorageName.user)).toBe(
        defaults[StorageName.user]
      );
      expect(strictAsyncStorage.getItem(StorageName.no)).toBe(
        defaults[StorageName.no]
      );
      expect(strictAsyncStorage.getItem(StorageName.enable)).toBe(
        defaults[StorageName.enable]
      );
      expect(strictAsyncStorage.getItem(StorageName.data)).toEqual(
        defaults[StorageName.data]
      );
    });

    it('test dispose', () => {
      expect(strictAsyncStorage.disposed).toBeFalsy();
      strictAsyncStorage.dispose();
      expect(strictAsyncStorage.disposed).toBeTruthy();
      expect(() => strictAsyncStorage.dispose()).toThrowError(
        '[strict-async-storage] Invalid operation. This has been disposed.'
      );

      expect(() => strictAsyncStorage.length).toThrowError(
        '[strict-async-storage] Invalid operation. Not initialized yet, failed to initialize or has been disposed.'
      );
      expect(() => strictAsyncStorage.getItem(StorageName.user)).toThrowError(
        '[strict-async-storage] Invalid operation. Not initialized yet, failed to initialize or has been disposed.'
      );
    });
  });
}
