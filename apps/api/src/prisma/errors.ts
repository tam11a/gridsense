import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/** `.catch(duplicateName('device'))` turns a unique-label clash into a 409. */
export const duplicateName =
  (what: string) =>
  (err: unknown): never => {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ConflictException(`A ${what} with this name already exists`);
    }
    throw err;
  };
