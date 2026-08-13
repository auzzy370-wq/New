import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped (e.g. pagination), pass through
        if (data && typeof data === 'object' && 'success' in (data as object)) {
          return data as unknown as ApiResponse<T>;
        }
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
