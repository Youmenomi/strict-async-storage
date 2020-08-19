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
  oneSetTest('default sync', new StrictAsyncStorage(defaults));

  oneSetTest(
    'cunstom async',
    new StrictAsyncStorage(defaults, {
      map: new Map(),
      driver: () => new AsyncDriver(),
    }),
    true
  );
});

function oneSetTest<TDriver extends DriverInterface = Storage>(
  testName: string | number | Function | jest.FunctionLike,
  strictAsyncStorage: StrictAsyncStorage<typeof defaults, StorageName, TDriver>,
  handleDispose = false
) {
  describe(testName, () => {
    restoreSaved();

    it('test init', async () => {
      await strictAsyncStorage.init();
      expect(strictAsyncStorage.defaults).toEqual(defaults);
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
      if (handleDispose) {
        const handler = jest.fn(() => {
          expect(() =>
            strictAsyncStorage.getItem(StorageName.user)
          ).not.toThrowError();
        });
        strictAsyncStorage.dispose(handler);
        expect(handler).toBeCalled();
      } else {
        strictAsyncStorage.dispose();
      }
      expect(strictAsyncStorage.length).toBe(0);
      expect(() => strictAsyncStorage.getItem(StorageName.user)).toThrowError(
        RangeError
      );
    });
  });
}
