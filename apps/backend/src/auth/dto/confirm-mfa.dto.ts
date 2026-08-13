import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmMfaDto {
  @ApiProperty({ description: 'TOTP code from authenticator app' })
  @IsString()
  @Length(6, 8)
  code: string;
}
