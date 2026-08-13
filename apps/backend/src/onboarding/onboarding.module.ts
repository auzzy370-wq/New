import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { StripeModule } from '../common/stripe/stripe.module';

@Module({
  imports: [PrismaModule, StripeModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
  exports: [OnboardingService],
})
export class OnboardingModule {}
