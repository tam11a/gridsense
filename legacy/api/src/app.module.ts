import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { RoomsModule } from './rooms/rooms.module';
import { SensorsModule } from './sensors/sensors.module';
import { SwitchesModule } from './switches/switches.module';
import { AuthModule } from './auth/auth.module';
import { MqttModule } from './mqtt/mqtt.module';
import { ChartModule } from './chart/chart.module';

@Module({
  imports: [
    PrismaModule,
    MqttModule,
    AuthModule,
    UsersModule,
    RolesModule,
    RoomsModule,
    SensorsModule,
    SwitchesModule,
    ChartModule,
  ],
  controllers: [AppController],
  // Every route needs a login unless marked @Public(). In 1.x only
  // auth/validate was guarded, so anyone could create users or delete devices.
  providers: [AppService, PrismaService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
