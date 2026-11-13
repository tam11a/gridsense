import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { PrismaService } from 'src/prisma/prisma.service';

/** Marks a route that works without logging in (only the login itself). */
export const Public = () => SetMetadata('isPublic', true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    const payload = await this.jwtService
      .verifyAsync(token, {
        secret: process.env.JWT_SECRET,
        maxAge: process.env.JWT_EXPIRE,
      })
      .catch(() => {
        throw new UnauthorizedException();
      });

    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: payload.sub,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: {
          select: {
            id: true,
            label: true,
            permissions: true,
          },
        },
        is_active: true,
      },
    });

    if (!user)
      throw new NotFoundException(
        'No user found. Contact administration about your account.',
      );

    if (!user.is_active)
      throw new UnauthorizedException(
        'Your account is temporarily suspended. Contact with administration.',
      );

    request['user'] = user;
    request['jwt_token'] = token;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
