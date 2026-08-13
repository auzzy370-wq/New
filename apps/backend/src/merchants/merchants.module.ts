import { Module } from '@nestjs/common';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';
import { AuthModule } from '../auth/auth.module';
import { StripeModule } from '../common/stripe/stripe.module';

@Module({
  imports: [AuthModule, StripeModule],
  controllers: [MerchantsController],
  providers: [MerchantsService],
  exports: [MerchantsService],
})
export class MerchantsModule {}
