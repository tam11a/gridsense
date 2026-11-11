import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword } from '../auth/password';
import { PERMISSIONS, hasPermission } from '../auth/permissions';

const PUBLIC_FIELDS = {
  id: true,
  first_name: true,
  last_name: true,
  email: true,
  role: { select: { id: true, label: true, permissions: true } },
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.UserSelect;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;

const normaliseEmail = (email?: string) => email?.trim().toLowerCase();

const checkEmail = (email?: string) => {
  if (!email || !EMAIL.test(email)) {
    throw new BadRequestException('Enter a valid email address');
  }
};

export const checkPassword = (password?: string) => {
  if (!password || password.length < MIN_PASSWORD) {
    throw new BadRequestException(
      `Password must be at least ${MIN_PASSWORD} characters`,
    );
  }
};

/** Turns Prisma's unique-constraint error into a readable 409. */
const rethrowDuplicate = (err: unknown): never => {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    throw new ConflictException('A user with this email already exists');
  }
  throw err;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { first_name, last_name, password, role_id } = createUserDto;
    const email = normaliseEmail(createUserDto.email);
    if (!first_name?.trim()) throw new BadRequestException('Name is required');
    checkEmail(email);
    checkPassword(password);
    await this.requireRole(role_id);

    const data = await this.prisma.user
      .create({
        data: {
          first_name: first_name.trim(),
          last_name: last_name?.trim() || null,
          email,
          password: await hashPassword(password),
          role: { connect: { id: Number(role_id) } },
        },
        select: PUBLIC_FIELDS,
      })
      .catch(rethrowDuplicate);

    return { message: 'User created', data, statusCode: 201 };
  }

  findAll() {
    return this.prisma.user.findMany({
      select: PUBLIC_FIELDS,
      orderBy: { created_at: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  /**
   * @param actorId the signed-in user making the change. Admins cannot
   * deactivate themselves or drop their own user-management rights, so the
   * last admin can never lock everyone out.
   */
  async update(id: number, dto: UpdateUserDto, actorId?: number) {
    await this.findOne(id);
    const email = normaliseEmail(dto.email);
    if (email !== undefined) checkEmail(email);
    if (dto.password !== undefined && dto.password !== '') {
      checkPassword(dto.password);
    }

    let roleId: number | undefined;
    if (dto.role_id !== undefined && dto.role_id !== null) {
      const role = await this.requireRole(dto.role_id);
      roleId = role.id;
      if (
        id === actorId &&
        !hasPermission(role.permissions, PERMISSIONS.USERS_MANAGE)
      ) {
        throw new BadRequestException(
          'You cannot remove your own user-management access',
        );
      }
    }
    if (id === actorId && dto.is_active === false) {
      throw new BadRequestException('You cannot deactivate your own account');
    }

    const data = await this.prisma.user
      .update({
        where: { id },
        data: {
          ...(dto.first_name !== undefined && {
            first_name: dto.first_name.trim(),
          }),
          ...(dto.last_name !== undefined && {
            last_name: dto.last_name?.trim() || null,
          }),
          ...(email !== undefined && { email }),
          ...(dto.password && { password: await hashPassword(dto.password) }),
          ...(typeof dto.is_active === 'boolean' && {
            is_active: dto.is_active,
          }),
          ...(roleId && { role: { connect: { id: roleId } } }),
        },
        select: PUBLIC_FIELDS,
      })
      .catch(rethrowDuplicate);

    return { message: 'User updated', data, statusCode: 200 };
  }

  async remove(id: number, actorId?: number) {
    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    await this.findOne(id);
    const data = await this.prisma.user.delete({
      where: { id },
      select: PUBLIC_FIELDS,
    });
    return { message: 'User deleted', data, statusCode: 200 };
  }

  private async requireRole(roleId: unknown) {
    const id = Number(roleId);
    const role = Number.isInteger(id)
      ? await this.prisma.role.findUnique({ where: { id } })
      : null;
    if (!role) throw new BadRequestException('Choose a valid role');
    return role;
  }
}
