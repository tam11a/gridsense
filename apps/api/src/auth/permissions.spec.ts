import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS, PermissionsGuard, hasPermission } from './permissions';
import { UsersService } from '../users/users.service';
import { nextLabel } from '../prisma/labels';

const ctx = (permissions: string[] | undefined) =>
  ({
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: { permissions } } }),
    }),
  } as any);

const guardNeeding = (needed?: string[]) =>
  new PermissionsGuard({
    getAllAndOverride: () => needed,
  } as unknown as Reflector);

describe('permissions', () => {
  it('"*" grants everything', () => {
    expect(hasPermission(['*'], PERMISSIONS.USERS_MANAGE)).toBe(true);
    expect(hasPermission([], PERMISSIONS.DEVICES_CONTROL)).toBe(false);
  });

  it('routes without a requirement are open to any signed-in user', () => {
    expect(guardNeeding(undefined).canActivate(ctx([]))).toBe(true);
  });

  it('an operator can control but not manage devices', () => {
    const op = ctx([PERMISSIONS.DEVICES_CONTROL]);
    expect(guardNeeding([PERMISSIONS.DEVICES_CONTROL]).canActivate(op)).toBe(
      true,
    );
    expect(() =>
      guardNeeding([PERMISSIONS.DEVICES_MANAGE]).canActivate(op),
    ).toThrow(ForbiddenException);
  });
});

describe('UsersService self-protection', () => {
  const viewer = { id: 3, label: 'Viewer', permissions: [] };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    role: { findUnique: jest.fn().mockResolvedValue(viewer) },
  };
  const users = new UsersService(prisma);

  it('cannot deactivate yourself', async () => {
    await expect(
      users.update(1, { is_active: false } as any, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('cannot drop your own user-management access', async () => {
    await expect(users.update(1, { role_id: 3 } as any, 1)).rejects.toThrow(
      'You cannot remove your own user-management access',
    );
  });

  it('cannot delete yourself', async () => {
    await expect(users.remove(1, 1)).rejects.toThrow(BadRequestException);
  });

  it('rejects short passwords and bad emails on create', async () => {
    await expect(
      users.create({
        first_name: 'A',
        email: 'nope',
        password: 'longenough',
        role_id: 1,
      } as any),
    ).rejects.toThrow('Enter a valid email address');
    await expect(
      users.create({
        first_name: 'A',
        email: 'a@b.co',
        password: 'short',
        role_id: 1,
      } as any),
    ).rejects.toThrow('at least 8');
  });
});

describe('nextLabel', () => {
  it('fills the first gap', () => {
    expect(nextLabel('Switch', ['Switch 1', 'switch 2', 'Switch 4'])).toBe(
      'Switch 3',
    );
    expect(nextLabel('Sensor', [])).toBe('Sensor 1');
  });
});
