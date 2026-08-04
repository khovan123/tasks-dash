import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { ApiSuccess } from "@tasks-dash/contracts";
import { Observable, map } from "rxjs";
@Injectable()
export class ApiEnvelopeInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    return next.handle().pipe(map((data) => ({ ok: true as const, data })));
  }
}
