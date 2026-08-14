import { RawBodyRequest } from '@nestjs/common';
import { Request, Response } from 'express';
import { WebhooksService } from './webhooks.service';
export declare class WebhooksController {
    private readonly webhooksService;
    private readonly logger;
    constructor(webhooksService: WebhooksService);
    handleStripeWebhook(req: RawBodyRequest<Request>, signature: string, _res: Response): Promise<{
        received: boolean;
    }>;
}
