import { IsEmail, IsString, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiProperty({ required: false, description: 'MFA TOTP code (6 digits)' })
  @IsOptional()
  @IsString()
  @Length(6, 8)
  mfaCode?: string;
}
