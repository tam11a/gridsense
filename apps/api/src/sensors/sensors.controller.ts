import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, RequirePermissions } from '../auth/permissions';

@ApiTags('Sensors')
@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Post()
  create(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorsService.create(createSensorDto);
  }

  @Get()
  findAll() {
    return this.sensorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sensorsService.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSensorDto: UpdateSensorDto,
  ) {
    return this.sensorsService.update(id, updateSensorDto);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.sensorsService.remove(id);
  }
}
