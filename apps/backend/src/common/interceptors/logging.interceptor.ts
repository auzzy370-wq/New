import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const statusCode = response.statusCode;

        if (duration > 2000) {
          this.logger.warn(`${method} ${url} - ${statusCode} - ${duration}ms [SLOW]`);
        } else if (process.env.NODE_ENV === 'development') {
          this.logger.debug(`${method} ${url} - ${statusCode} - ${duration}ms`);
        }
      }),
    );
  }
}
