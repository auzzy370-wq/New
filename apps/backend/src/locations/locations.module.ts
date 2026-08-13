import { Module } from '@nestjs/common';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { StripeModule } from '../common/stripe/stripe.module';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}
