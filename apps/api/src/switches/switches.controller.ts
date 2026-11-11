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
import { SwitchesService } from './switches.service';
import { CreateSwitchDto } from './dto/create-switch.dto';
import { UpdateSwitchDto } from './dto/update-switch.dto';
import { SwitchActionDto } from './dto/switch-action.dto';
import { ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, RequirePermissions } from '../auth/permissions';

@ApiTags('Switches')
@Controller('switches')
export class SwitchesController {
  constructor(private readonly switchesService: SwitchesService) {}

  /** Turn a switch on or off. Replaces publishing straight to MQTT from the browser. */
  @RequirePermissions(PERMISSIONS.DEVICES_CONTROL)
  @Post(':id/action')
  action(
    @Param('id', ParseIntPipe) id: number,
    @Body() { action }: SwitchActionDto,
  ) {
    return this.switchesService.action(id, action);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Post()
  create(@Body() createSwitchDto: CreateSwitchDto) {
    return this.switchesService.create(createSwitchDto);
  }

  @Get()
  findAll() {
    return this.switchesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.switchesService.findOne(id);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSwitchDto: UpdateSwitchDto,
  ) {
    return this.switchesService.update(id, updateSwitchDto);
  }

  @RequirePermissions(PERMISSIONS.DEVICES_MANAGE)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.switchesService.remove(id);
  }
}
