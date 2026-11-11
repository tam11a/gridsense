import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { hashPassword, isHashed, verifyPassword } from './password';

const SECRET = 'test-secret-that-is-at-least-32-characters';

const httpContext = (headers: Record<string, string>, isPublic = false) => {
  const request: any = { headers };
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
  const context: any = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return { request, reflector, context };
};

describe('password helpers', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('correct horse');
    expect(isHashed(hash)).toBe(true);
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('still accepts legacy plain-text passwords', async () => {
    expect(isHashed('12345678')).toBe(false);
    expect(await verifyPassword('12345678', '12345678')).toBe(true);
    expect(await verifyPassword('nope', '12345678')).toBe(false);
  });
});

describe('AuthGuard', () => {
  const jwt = new JwtService({ secret: SECRET });
  const activeUser = { id: 1, email: 'a@b.c', is_active: true };
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(activeUser) },
  };

  it('lets @Public routes through without a token', async () => {
    const { reflector, context } = httpContext({}, true);
    const guard = new AuthGuard(jwt, prisma, reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects requests without a token', async () => {
    const { reflector, context } = httpContext({});
    const guard = new AuthGuard(jwt, prisma, reflector);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const forged = await new JwtService({
      secret: 'another-secret-another-secret-0000',
    }).signAsync({ sub: 1 });
    const { reflector, context } = httpContext({
      authorization: `Bearer ${forged}`,
    });
    const guard = new AuthGuard(jwt, prisma, reflector);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('accepts a valid token and attaches the user', async () => {
    const token = await jwt.signAsync({ sub: 1 });
    const { request, reflector, context } = httpContext({
      authorization: `Bearer ${token}`,
    });
    const guard = new AuthGuard(jwt, prisma, reflector);
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual(activeUser);
  });

  it('rejects suspended users', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({
      ...activeUser,
      is_active: false,
    });
    const token = await jwt.signAsync({ sub: 1 });
    const { reflector, context } = httpContext({
      authorization: `Bearer ${token}`,
    });
    const guard = new AuthGuard(jwt, prisma, reflector);
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('AuthService.login', () => {
  const jwt = new JwtService({ secret: SECRET });
  const baseUser = {
    id: 7,
    first_name: 'Grid',
    last_name: null,
    email: 'admin@example.com',
    is_active: true,
    role: { id: 1, label: 'Administrator', permissions: ['*'] },
    created_at: new Date(),
    updated_at: new Date(),
  };

  it('gives the same error for unknown email and wrong password', async () => {
    const prisma: any = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            ...baseUser,
            password: await hashPassword('right-password'),
          }),
      },
    };
    const service = new AuthService(jwt, prisma);
    const unknown = service.login({ email: 'x@y.z', password: 'whatever' });
    await expect(unknown).rejects.toThrow('Invalid email or password');
    const wrong = service.login({
      email: baseUser.email,
      password: 'wrong-password',
    });
    await expect(wrong).rejects.toThrow('Invalid email or password');
  });

  it('upgrades a legacy plain-text password to a hash on login', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const prisma: any = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ ...baseUser, password: 'legacy-pass' }),
        update,
      },
    };
    const service = new AuthService(jwt, prisma);
    const res = await service.login({
      email: baseUser.email,
      password: 'legacy-pass',
    });
    expect(res.data.token).toBeTruthy();
    expect(update).toHaveBeenCalledTimes(1);
    expect(isHashed(update.mock.calls[0][0].data.password)).toBe(true);
  });
});
