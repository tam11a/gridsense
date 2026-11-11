import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { MqttService } from './mqtt/mqtt.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService, private mqtt: MqttService) {}

  async health() {
    const database = await this.prisma.$queryRaw`SELECT 1`
      .then(() => 'up')
      .catch(() => 'down');
    const mqtt = this.mqtt.mqttClient?.connected ? 'up' : 'down';
    return {
      service: 'gridsense-api',
      status: database === 'up' && mqtt === 'up' ? 'ok' : 'degraded',
      database,
      mqtt,
    };
  }
}
