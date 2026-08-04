import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PROBLEM_CODES, REQUIRED_ACTIONS } from "@tasks-dash/contracts";
@Catch()
export class GlobalProblemFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const detail = typeof raw === "string" ? raw : (raw as { message?: string | string[] } | null)?.message;
    response.status(status).json({
      ok: false,
      problem: {
        type: `https://tasks-dash.local/problems/${status}`,
        status,
        code: status === 404 ? PROBLEM_CODES.notFound : status === 409 ? PROBLEM_CODES.conflict : status === 400 ? PROBLEM_CODES.validationFailed : PROBLEM_CODES.internalError,
        titleKey: `problem.${status}.title`,
        detailKey: Array.isArray(detail) ? detail.join(", ") : detail ?? "problem.internal.detail",
        requiredAction: status === 400 ? REQUIRED_ACTIONS.fixInput : status >= 500 ? REQUIRED_ACTIONS.retry : REQUIRED_ACTIONS.none,
        correlationId: randomUUID(),
        meta: {},
      },
    });
  }
}
