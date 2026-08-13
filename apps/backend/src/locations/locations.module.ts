import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../common/stripe/stripe.module';

@Module({
  imports: [AuthModule, StripeModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
