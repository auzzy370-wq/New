import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  RawBodyRequest,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
import { Public } from '../common/decorators/permissions.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  /**
   * Stripe webhook endpoint.
   * - Public (no JWT auth)
   * - Uses raw body for signature verification
   * - Must be mounted BEFORE global prefix (/api/v1) for Stripe delivery
   */
  @Public()
  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res({ passthrough: true }) _res: Response,
  ) {
    const rawBody = req.rawBody;

    if (!rawBody) {
      this.logger.error('No raw body available. Ensure rawBody option is enabled in NestFactory.');
      return { received: false };
    }

    if (!signature) {
      this.logger.error('No Stripe signature header');
      return { received: false };
    }

    await this.webhooksService.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }
}
