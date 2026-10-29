import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { BizCode } from '../exceptions/business.exception';

/**
 * 统一响应包装：把控制器返回的裸数据包成 `{ code, message, data }`。
 * 若返回值已经是该结构（例如分页对象自带 code），则不再二次包装。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'code' in (data as object) && 'data' in (data as object)) {
          return data;
        }
        return { code: BizCode.SUCCESS, message: 'success', data: data ?? null };
      }),
    );
  }
}
