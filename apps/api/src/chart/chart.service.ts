import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Most points one chart needs; longer ranges are averaged into buckets. */
const TARGET_POINTS = 360;
const MIN_BUCKET_SECONDS = 60;
const RAW_LIMIT = 500;

type Point = { created_at: Date; temperature: number; humidity: number };

@Injectable()
export class ChartService {
  constructor(private prisma: PrismaService) {}

  /**
   * Readings for one sensor, oldest first.
   * With a date range, readings are averaged into time buckets so a 30-day
   * view returns a few hundred points instead of ~90k raw rows. Without a
   * range, the latest RAW_LIMIT readings are returned as they are.
   */
  async getTemperatureData(
    sensor_id?: number,
    date_lte?: string,
    date_gte?: string,
  ): Promise<Point[]> {
    const sensorId = Number(sensor_id);
    if (!Number.isInteger(sensorId) || sensorId < 1) {
      throw new BadRequestException('sensor_id is required');
    }

    if (!date_lte || !date_gte) {
      const rows = await this.prisma.sensorData.findMany({
        where: { sensor_id: sensorId },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        take: RAW_LIMIT,
        select: { created_at: true, temperature: true, humidity: true },
      });
      return rows.reverse();
    }

    const from = new Date(date_gte);
    const to = new Date(date_lte);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      throw new BadRequestException('Invalid date range');
    }

    const span = (to.getTime() - from.getTime()) / 1000;
    const bucket = Math.max(
      MIN_BUCKET_SECONDS,
      Math.ceil(span / TARGET_POINTS),
    );

    // created_at is stored as UTC "timestamp without time zone".
    const rows = await this.prisma.$queryRaw<Point[]>(Prisma.sql`
      SELECT
        date_bin(make_interval(secs => ${bucket}), created_at, ${from}::timestamp) AS created_at,
        round(avg(temperature)::numeric, 2)::float8 AS temperature,
        round(avg(humidity)::numeric, 2)::float8 AS humidity
      FROM sensor_data
      WHERE sensor_id = ${sensorId}
        AND created_at >= ${from}::timestamp
        AND created_at <= ${to}::timestamp
      GROUP BY 1
      ORDER BY 1
    `);
    return rows;
  }
}
