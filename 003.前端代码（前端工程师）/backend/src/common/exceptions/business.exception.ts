import { HttpException, HttpStatus } from '@nestjs/common';

/** 业务错误码：前端据此做差异化处理 */
export enum BizCode {
  SUCCESS = 0,
  /** 参数校验失败 */
  INVALID_PARAM = 40001,
  /** 业务规则不满足（如出库超结存） */
  BUSINESS_RULE = 40002,
  /** 未登录 / token 失效 */
  UNAUTHORIZED = 40101,
  /** 用户名或密码错误 */
  BAD_CREDENTIALS = 40102,
  /** 无权限 */
  FORBIDDEN = 40301,
  /** 资源不存在 */
  NOT_FOUND = 40401,
  /** 冲突（用户名已存在、拼音码重复等） */
  CONFLICT = 40901,
  /** 账号被锁定 */
  LOCKED = 42901,
  /** 服务器内部错误 */
  INTERNAL = 50001,
}

/**
 * 业务异常。抛出后由全局过滤器统一转成 `{ code, message }` 结构。
 */
export class BusinessException extends HttpException {
  constructor(
    message: string,
    code: BizCode = BizCode.BUSINESS_RULE,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super({ code, message }, httpStatus);
  }
}
