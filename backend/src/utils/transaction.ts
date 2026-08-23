import mongoose, { ClientSession } from 'mongoose';

/**
 * MongoDB refuses transactions on a standalone server (IllegalOperation, code
 * 20). Atlas is a replica set so the real deployment gets them; a local
 * standalone used for development should still work, just without the
 * all-or-nothing guarantee.
 */
const isTransactionUnsupported = (err: unknown): boolean => {
  if (typeof err !== 'object' || err === null) {
    return false;
  }

  const { code, message } = err as { code?: number | string; message?: string };
  return code === 20 || Boolean(message?.includes('Transaction numbers are only allowed'));
};

/**
 * Runs `fn` inside a transaction where the server supports one, otherwise runs
 * it unwrapped. The callback receives the ClientSession to pass to each write,
 * or null when running without a transaction.
 */
export const withTransaction = async <T>(
  fn: (session: ClientSession | null) => Promise<T>
): Promise<T> => {
  let dbSession: ClientSession;

  try {
    dbSession = await mongoose.startSession();
  } catch {
    return fn(null);
  }

  try {
    let result!: T;
    await dbSession.withTransaction(async () => {
      result = await fn(dbSession);
    });
    return result;
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      return fn(null);
    }
    throw err;
  } finally {
    await dbSession.endSession();
  }
};
