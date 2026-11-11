import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty()
  first_name: string;

  @ApiProperty({ required: false, nullable: true })
  last_name?: string | null;
}

export class ChangePasswordDto {
  @ApiProperty()
  current_password: string;

  @ApiProperty({ description: 'At least 8 characters' })
  new_password: string;
}
