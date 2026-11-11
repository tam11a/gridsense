import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { PrismaService } from '../prisma/prisma.service';

const MAX_CHILDREN = 32;

const clampCount = (value: unknown, field: string) => {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_CHILDREN) {
    throw new BadRequestException(
      `${field} must be a whole number between 0 and ${MAX_CHILDREN}`,
    );
  }
  return n;
};

@Injectable()
export class RoomsService {
  constructor(private prisma: PrismaService) {}

  async create(createRoomDto: CreateRoomDto) {
    const { label, description } = createRoomDto;
    // Form inputs arrive as strings; clamp so one request cannot create
    // thousands of rows.
    const sensors = clampCount(createRoomDto.sensors ?? 1, 'sensors');
    const switches = clampCount(createRoomDto.switches ?? 1, 'switches');
    // Labels are unique in the schema, so random 0-999 numbers collided.
    const tag = () => randomUUID().slice(0, 8);
    const data = await this.prisma.room.create({
      data: {
        label,
        description,
        sensors: {
          createMany: {
            data: Array.from({ length: sensors }).map((_, i) => ({
              label: `${label} / Sensor ${i + 1} (${tag()})`,
            })),
          },
        },
        switches: {
          createMany: {
            data: Array.from({ length: switches }).map((_, i) => ({
              label: `${label} / Switch ${i + 1} (${tag()})`,
            })),
          },
        },
      },
      select: {
        id: true,
        label: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      message: 'Room created successfully',
      data,
      statusCode: 201,
    };
  }

  findAll() {
    return this.prisma.room.findMany({
      // select: {
      //   id: true,
      //   label: true,
      //   description: true,
      //   created_at: true,
      //   updated_at: true,
      // },
      include: {
        sensors: {
          include: {
            sensor_data: {
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
        },
        switches: {
          include: {
            SwitchState: {
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const room = await this.prisma.room.findUnique({
      where: {
        id,
      },
      // select: {
      //   id: true,
      //   label: true,
      //   description: true,
      //   created_at: true,
      //   updated_at: true,
      // },
      include: {
        sensors: {
          include: {
            sensor_data: {
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
        },
        switches: {
          include: {
            SwitchState: {
              orderBy: {
                created_at: 'desc',
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async update(id: number, updateRoomDto: UpdateRoomDto) {
    const { label, description } = updateRoomDto;
    const data = await this.prisma.room.update({
      where: {
        id,
      },
      data: {
        label,
        description,
      },
      select: {
        id: true,
        label: true,
        description: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      message: 'Room updated successfully',
      data,
      statusCode: 200,
    };
  }

  async remove(id: number) {
    const room = await this.prisma.room.findUnique({
      where: {
        id,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    const data = await this.prisma.room.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Room deleted successfully',
      data,
      statusCode: 200,
    };
  }
}
