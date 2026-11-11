import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, isHashed, verifyPassword } from './password';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService, private prisma: PrismaService) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        role: true,
      },
    });

    // Same message for unknown email and wrong password, so the endpoint
    // cannot be used to find out which emails have accounts.
    if (!user || !(await verifyPassword(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.is_active) {
      throw new UnauthorizedException(
        'Your account is temporarily suspended. Contact with administration.',
      );
    }

    // Upgrade accounts that still store a plain-text password.
    if (!isHashed(user.password)) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      });
    }

    // Generate token
    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      name: [user.first_name, user.last_name].filter(Boolean).join(' '),
    });

    return {
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          role: user.role,
          is_active: user.is_active,
          created_at: user.created_at,
          updated_at: user.updated_at,
        },
      },
      statusCode: 200,
    };
  }

  async validate(user: any) {
    return {
      message: 'User is valid',
      data: user,
      statusCode: 200,
    };
  }
}
