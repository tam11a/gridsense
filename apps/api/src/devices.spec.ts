import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { RoomsService } from './rooms/rooms.service';
import { SwitchesService } from './switches/switches.service';

describe('RoomsService.create', () => {
  const makePrisma = () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    return { prisma: { room: { create } } as any, create };
  };

  it('creates uniquely labelled sensors and switches from string counts', async () => {
    const { prisma, create } = makePrisma();
    await new RoomsService(prisma).create({
      label: 'Pond A',
      sensors: '2' as any,
      switches: '6' as any,
    });
    const { data } = create.mock.calls[0][0];
    const sensorLabels = data.sensors.createMany.data.map((s) => s.label);
    const switchLabels = data.switches.createMany.data.map((s) => s.label);
    expect(sensorLabels).toHaveLength(2);
    expect(switchLabels).toHaveLength(6);
    expect(new Set(switchLabels).size).toBe(6);
    expect(switchLabels[0]).toMatch(/^Pond A \/ Switch 1 \(/);
  });

  it.each([-1, 33, 1.5, 'abc'])('rejects count %p', async (bad) => {
    const { prisma } = makePrisma();
    await expect(
      new RoomsService(prisma).create({ label: 'X', switches: bad as any }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('SwitchesService.action', () => {
  const setup = (sw: any) => {
    const publishSwitchCommand = jest.fn();
    const prisma: any = {
      switch: { findUnique: jest.fn().mockResolvedValue(sw) },
    };
    const service = new SwitchesService(prisma, {
      publishSwitchCommand,
    } as any);
    return { service, publishSwitchCommand };
  };

  it('publishes the command when remote control is on', async () => {
    const { service, publishSwitchCommand } = setup({
      id: 3,
      room: { remote_action: true },
    });
    await service.action(3, true);
    expect(publishSwitchCommand).toHaveBeenCalledWith(3, true);
  });

  it('refuses when the device is under manual control', async () => {
    const { service, publishSwitchCommand } = setup({
      id: 3,
      room: { remote_action: false },
    });
    await expect(service.action(3, true)).rejects.toThrow(ConflictException);
    expect(publishSwitchCommand).not.toHaveBeenCalled();
  });

  it('404s for an unknown switch and 400s for a non-boolean action', async () => {
    const { service } = setup(null);
    await expect(service.action(99, false)).rejects.toThrow(NotFoundException);
    await expect(service.action(99, 'on' as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
