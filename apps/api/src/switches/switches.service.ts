import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service';
import { CreateSwitchDto } from './dto/create-switch.dto';
import { UpdateSwitchDto } from './dto/update-switch.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SwitchesService {
  constructor(private prisma: PrismaService, private mqtt: MqttService) {}

  async action(id: number, action: boolean) {
    if (typeof action !== 'boolean') {
      throw new BadRequestException('action must be true or false');
    }

    const switch_ = await this.prisma.switch.findUnique({
      where: { id },
      select: { id: true, room: { select: { remote_action: true } } },
    });
    if (!switch_) throw new NotFoundException('Switch not found');
    if (!switch_.room.remote_action) {
      throw new ConflictException(
        'Remote control is disabled for this device (manual control is on)',
      );
    }

    // Same topic and payload the MQTT relay used, so device firmware is unchanged.
    this.mqtt.publishSwitchCommand(id, action);

    return {
      message: `Switch ${action ? 'start' : 'stop'} command sent`,
      data: { id, action },
      statusCode: 201,
    };
  }

  async create(createSwitchDto: CreateSwitchDto) {
    const { label, description, room_id } = createSwitchDto;

    const data = await this.prisma.switch.create({
      data: {
        label,
        description,
        room: {
          connect: {
            id: room_id,
          },
        },
      },
      select: {
        id: true,
        label: true,
        description: true,
        room: {
          select: {
            id: true,
            label: true,
          },
        },
        created_at: true,
        updated_at: true,
      },
    });

    return {
      message: 'Switch created successfully',
      data,
      statusCode: 201,
    };
  }

  findAll() {
    return this.prisma.switch.findMany({
      select: {
        id: true,
        label: true,
        description: true,
        room: {
          select: {
            id: true,
            label: true,
          },
        },
        created_at: true,
        updated_at: true,
      },
    });
  }

  async findOne(id: number) {
    const switch_ = await this.prisma.switch.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        label: true,
        description: true,
        room: {
          select: {
            id: true,
            label: true,
          },
        },
        created_at: true,
        updated_at: true,
      },
    });

    if (!switch_) {
      throw new NotFoundException('Switch not found');
    }

    return switch_;
  }

  async update(id: number, updateSwitchDto: UpdateSwitchDto) {
    const { label, description, room_id } = updateSwitchDto;

    const switch_ = await this.prisma.switch.findUnique({
      where: {
        id,
      },
    });

    if (!switch_) {
      throw new NotFoundException('Switch not found');
    }

    const data = await this.prisma.switch.update({
      where: {
        id,
      },
      data: {
        label,
        description,
        ...(room_id && {
          room: {
            connect: {
              id: room_id,
            },
          },
        }),
      },
      select: {
        id: true,
        label: true,
        description: true,
        room: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      message: 'Switch updated successfully',
      data,
      statusCode: 200,
    };
  }

  async remove(id: number) {
    const switch_ = await this.prisma.switch.findUnique({
      where: {
        id,
      },
    });

    if (!switch_) {
      throw new NotFoundException('Switch not found');
    }

    const data = await this.prisma.switch.delete({
      where: {
        id,
      },
      select: {
        id: true,
        label: true,
        description: true,
        room: true,
        created_at: true,
        updated_at: true,
      },
    });

    return {
      message: 'Switch deleted successfully',
      data,
      statusCode: 200,
    };
  }
}
