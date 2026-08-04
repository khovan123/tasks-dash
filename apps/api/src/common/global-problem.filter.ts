import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  ProblemCode,
  PROBLEM_CODES,
  RequiredAction,
  REQUIRED_ACTIONS,
} from "@tasks-dash/contracts";
import type { Request, Response } from "express";

function classification(status: number): {
  code: ProblemCode;
  requiredAction: RequiredAction;
} {
  if (status === HttpStatus.BAD_REQUEST) {
    return {
      code: PROBLEM_CODES.validationFailed,
      requiredAction: REQUIRED_ACTIONS.fixInput,
    };
  }
  if (status === HttpStatus.UNAUTHORIZED) {
    return {
      code: PROBLEM_CODES.unauthorized,
      requiredAction: REQUIRED_ACTIONS.signIn,
    };
  }
  if (status === HttpStatus.FORBIDDEN) {
    return {
      code: PROBLEM_CODES.forbidden,
      requiredAction: REQUIRED_ACTIONS.requestAccess,
    };
  }
  if (status === HttpStatus.NOT_FOUND) {
    return {
      code: PROBLEM_CODES.notFound,
      requiredAction: REQUIRED_ACTIONS.none,
    };
  }
  if (status === HttpStatus.CONFLICT) {
    return {
      code: PROBLEM_CODES.conflict,
      requiredAction: REQUIRED_ACTIONS.fixInput,
    };
  }
  if (
    status === HttpStatus.BAD_GATEWAY ||
    status === HttpStatus.SERVICE_UNAVAILABLE ||
    status === HttpStatus.GATEWAY_TIMEOUT
  ) {
    return {
      code: PROBLEM_CODES.integrationUnavailable,
      requiredAction: REQUIRED_ACTIONS.reconnectIntegration,
    };
  }
  return {
    code: PROBLEM_CODES.internalError,
    requiredAction: REQUIRED_ACTIONS.retry,
  };
}

@Catch()
export class GlobalProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const detail =
      typeof raw === "string"
        ? raw
        : (raw as { message?: string | string[] } | null)?.message;
    const { code, requiredAction } = classification(status);
    const requestId = request.headers["x-request-id"];
    const correlationId =
      typeof requestId === "string" && requestId.trim()
        ? requestId.trim()
        : randomUUID();
    const safeDetail =
      status >= 500
        ? "problem.internal.detail"
        : Array.isArray(detail)
          ? detail.join(", ")
          : detail ?? `problem.${status}.detail`;

    response.status(status).json({
      ok: false,
      problem: {
        type: `urn:tasks-dash:problem:${code.toLowerCase()}`,
        status,
        code,
        titleKey: `problem.${status}.title`,
        detailKey: safeDetail,
        requiredAction,
        correlationId,
        meta: {},
      },
    });
  }
}
