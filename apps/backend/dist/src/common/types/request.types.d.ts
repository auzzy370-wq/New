import { Request } from 'express';
import { Merchant, MerchantUser, User } from '@prisma/client';
export interface JwtPayload {
    sub: string;
    email: string;
    role: string;
    jti: string;
    merchantId?: string;
    iat?: number;
    exp?: number;
}
export interface AuthenticatedUser extends User {
    currentMerchantId?: string;
    merchantUser?: MerchantUser;
}
export interface RequestWithUser extends Request {
    user: AuthenticatedUser;
    merchant?: Merchant;
}
