import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Permission strings stored on Role.permissions.
 * '*' grants everything. Reading data only needs a valid login.
 */
export const PERMISSIONS = {
  ALL: '*',
  DEVICES_MANAGE: 'devices.manage', // create / edit / delete devices, sensors, switches
  DEVICES_CONTROL: 'devices.control', // start / stop switches
  USERS_MANAGE: 'users.manage', // users and roles
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Default roles, created by the seed if missing. */
export const DEFAULT_ROLES: { label: string; permissions: Permission[] }[] = [
  { label: 'Administrator', permissions: [PERMISSIONS.ALL] },
  {
    label: 'Operator',
    permissions: [PERMISSIONS.DEVICES_CONTROL],
  },
  { label: 'Viewer', permissions: [] },
];

const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const hasPermission = (
  granted: string[] | undefined,
  needed: Permission,
) =>
  !!granted && (granted.includes(PERMISSIONS.ALL) || granted.includes(needed));

/** Runs after AuthGuard, which attaches request.user (with role). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const needed = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!needed?.length) return true;

    const granted: string[] | undefined = context.switchToHttp().getRequest()
      .user?.role?.permissions;
    const missing = needed.filter((p) => !hasPermission(granted, p));
    if (missing.length) {
      throw new ForbiddenException(
        `Your role does not allow this (needs ${missing.join(', ')})`,
      );
    }
    return true;
  }
}
