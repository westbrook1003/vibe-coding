import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { BizCode } from '../exceptions/business.exception';

/**
 * 全局异常过滤器。
 * 统一错误响应结构：`{ code, message, path, timestamp }`，
 * 并把底层数据库错误翻译成用户能看懂的中文提示。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: BizCode = BizCode.INTERNAL;
    let message = '服务器开小差了，请稍后重试';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const body = payload as Record<string, unknown>;
        code = (body.code as BizCode) ?? BizCode.INVALID_PARAM;
        message = (body.message as string) ?? exception.message;
        // class-validator 的校验错误数组 → 拼成可读文案
        if (Array.isArray(body.message)) {
          message = (body.message as string[]).join('；');
        }
      }
    } else if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string; message?: string };
      // MySQL 唯一索引冲突
      if (driverError?.code === 'ER_DUP_ENTRY' || /UNIQUE constraint/i.test(driverError?.message ?? '')) {
        httpStatus = HttpStatus.CONFLICT;
        code = BizCode.CONFLICT;
        message = '数据已存在，请勿重复提交';
      } else {
        this.logger.error(`数据库异常: ${exception.message}`, exception.stack);
      }
    } else {
      this.logger.error(`未捕获异常: ${(exception as Error)?.message}`, (exception as Error)?.stack);
    }

    response.status(httpStatus).json({
      code,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
