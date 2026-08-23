import { SessionService } from '../sessionService';
import DialysisSession from '../../models/Session';

/**
 * Guards the two query-handling fixes: an uncapped `limit` let a caller ask for
 * the whole collection in one request, and `?patientId[$ne]=...` was assigned
 * straight onto the Mongo filter, letting a caller inject operators.
 */
describe('SessionService.getPaginatedSessions', () => {
  let findSpy: jest.SpyInstance;
  let countSpy: jest.SpyInstance;
  let lastLimit: number | undefined;

  beforeEach(() => {
    lastLimit = undefined;
    const chain: any = {
      sort: () => chain,
      skip: () => chain,
      limit: (n: number) => {
        lastLimit = n;
        return chain;
      },
      populate: () => Promise.resolve([]),
    };
    findSpy = jest.spyOn(DialysisSession, 'find').mockReturnValue(chain);
    countSpy = jest.spyOn(DialysisSession, 'countDocuments').mockResolvedValue(0 as never);
  });

  afterEach(() => jest.restoreAllMocks());

  it('caps limit at 100 however large the caller asks for', async () => {
    await SessionService.getPaginatedSessions({ limit: '100000' });
    expect(lastLimit).toBe(100);
  });

  it('floors limit at 1 for zero and negative values', async () => {
    await SessionService.getPaginatedSessions({ limit: '-5' });
    expect(lastLimit).toBe(1);
  });

  it('floors page at 1 so skip is never negative', async () => {
    const result = await SessionService.getPaginatedSessions({ page: '-3' });
    expect(result.page).toBe(1);
  });

  it('drops a Mongo operator object passed as patientId', async () => {
    await SessionService.getPaginatedSessions({
      patientId: { $ne: '6a7f402b5dbe023cbc93463c' } as unknown,
    });
    expect(findSpy).toHaveBeenCalledWith({});
    expect(countSpy).toHaveBeenCalledWith({});
  });

  it('still filters by a legitimate string patientId', async () => {
    await SessionService.getPaginatedSessions({ patientId: '6a7f402b5dbe023cbc93463c' });
    expect(findSpy).toHaveBeenCalledWith({ patientId: '6a7f402b5dbe023cbc93463c' });
  });
});
