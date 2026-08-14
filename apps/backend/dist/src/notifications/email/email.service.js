"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var EmailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const nodemailer = require("nodemailer");
let EmailService = EmailService_1 = class EmailService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(EmailService_1.name);
        this.transporter = nodemailer.createTransport({
            host: configService.get('SMTP_HOST', 'localhost'),
            port: configService.get('SMTP_PORT', 1025),
            secure: configService.get('SMTP_PORT', 1025) === 465,
            auth: configService.get('SMTP_USER')
                ? {
                    user: configService.get('SMTP_USER'),
                    pass: configService.get('SMTP_PASS'),
                }
                : undefined,
        });
    }
    async sendVerificationEmail(email, firstName, token) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
        const verificationUrl = `${frontendUrl}/auth/verify-email?token=${token}`;
        await this.send({
            to: email,
            subject: 'Verify your TapFlow POS account',
            html: this.buildEmailTemplate({
                title: 'Verify Your Email',
                previewText: 'Click the button below to verify your email address.',
                body: `
          <p>Hi ${firstName},</p>
          <p>Thanks for signing up for TapFlow POS! Please verify your email address to get started.</p>
          <p>This link will expire in 24 hours.</p>
        `,
                ctaText: 'Verify Email',
                ctaUrl: verificationUrl,
            }),
        });
    }
    async sendPasswordResetEmail(email, firstName, token) {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
        const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;
        await this.send({
            to: email,
            subject: 'Reset your TapFlow POS password',
            html: this.buildEmailTemplate({
                title: 'Reset Your Password',
                previewText: 'Click the button below to reset your password.',
                body: `
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your TapFlow POS password. Click the button below to create a new password.</p>
          <p>This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        `,
                ctaText: 'Reset Password',
                ctaUrl: resetUrl,
            }),
        });
    }
    async sendReceiptEmail(params) {
        const itemsHtml = params.items
            .map((item) => `<tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.name}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${item.price}</td>
          </tr>`)
            .join('');
        await this.send({
            to: params.to,
            subject: `Receipt from ${params.merchantName} - Order #${params.orderNumber}`,
            html: this.buildEmailTemplate({
                title: `Receipt - ${params.merchantName}`,
                previewText: `Your receipt for order #${params.orderNumber}`,
                body: `
          <p>Thank you for your purchase at <strong>${params.merchantName}</strong>!</p>
          <p><strong>Order #${params.orderNumber}</strong></p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <thead>
              <tr>
                <th style="text-align: left; padding: 8px 0; border-bottom: 2px solid #ddd;">Item</th>
                <th style="text-align: center; padding: 8px 0; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="text-align: right; padding: 8px 0; border-bottom: 2px solid #ddd;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 12px 0; font-weight: bold;">Total</td>
                <td style="padding: 12px 0; font-weight: bold; text-align: right;">${params.total}</td>
              </tr>
            </tfoot>
          </table>
        `,
                ctaText: params.receiptUrl ? 'View Full Receipt' : undefined,
                ctaUrl: params.receiptUrl,
            }),
        });
    }
    async sendSubscriptionFailedEmail(email, firstName) {
        await this.send({
            to: email,
            subject: 'Action required: TapFlow POS subscription payment failed',
            html: this.buildEmailTemplate({
                title: 'Subscription Payment Failed',
                previewText: 'Your subscription payment could not be processed.',
                body: `
          <p>Hi ${firstName},</p>
          <p>We were unable to process your TapFlow POS subscription payment.</p>
          <p>Please update your payment method to continue using TapFlow POS without interruption.</p>
        `,
                ctaText: 'Update Payment Method',
                ctaUrl: `${this.configService.get('FRONTEND_URL')}/dashboard/billing`,
            }),
        });
    }
    async send(options) {
        try {
            await this.transporter.sendMail({
                from: this.configService.get('EMAIL_FROM', 'noreply@tapflow.app'),
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
        }
        catch (error) {
            this.logger.error(`Failed to send email to ${options.to}:`, error);
        }
    }
    buildEmailTemplate(params) {
        const cta = params.ctaText && params.ctaUrl
            ? `<div style="text-align: center; margin: 32px 0;">
            <a href="${params.ctaUrl}" style="background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">${params.ctaText}</a>
          </div>`
            : '';
        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 20px;">
  <span style="display:none; max-height:0px; overflow:hidden;">${params.previewText}</span>
  <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background-color: #6366f1; padding: 24px 40px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">TapFlow POS</h1>
      </td>
    </tr>
    <tr>
      <td style="background-color: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
        <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px;">${params.title}</h2>
        <div style="color: #4a4a6a; font-size: 16px; line-height: 1.6;">${params.body}</div>
        ${cta}
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
        <p style="color: #9ca3af; font-size: 13px; margin: 0;">
          This email was sent by TapFlow POS. If you have questions, contact <a href="mailto:support@tapflow.app" style="color: #6366f1;">support@tapflow.app</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = EmailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map