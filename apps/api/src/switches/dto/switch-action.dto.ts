import { ApiProperty } from '@nestjs/swagger';

export class SwitchActionDto {
  @ApiProperty({ description: 'true = start, false = stop' })
  action: boolean;
}
