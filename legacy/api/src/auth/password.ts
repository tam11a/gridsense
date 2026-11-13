import * as bcrypt from 'bcryptjs';

const ROUNDS = 10;
const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

export const isHashed = (value: string) => BCRYPT_PREFIX.test(value);

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS);

/**
 * Compares a plain password with what is stored. Accounts created before
 * hashing was introduced still hold plain text; those compare directly so the
 * caller can upgrade them to a hash after a successful login.
 */
export const verifyPassword = async (plain: string, stored: string) =>
  isHashed(stored) ? bcrypt.compare(plain, stored) : plain === stored;
