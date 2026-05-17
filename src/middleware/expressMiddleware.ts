import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import type { LogFlow } from '../core/LogFlow';
import { RequestTracker, RequestContext } from '../core/RequestTracker';
import { ResponseInterceptor } from '../core/ResponseInterceptor';
import type { LifecycleLog } from '../types/LifecycleLog';

type LogFlowLocals = {
  __logflowContext?: RequestContext;
};

export class ExpressMiddleware {
  private readonly logFlow: LogFlow;
  private readonly requestTracker: RequestTracker;
  private readonly responseInterceptor: ResponseInterceptor;

  public constructor(logFlow: LogFlow, requestTracker: RequestTracker, responseInterceptor: ResponseInterceptor) {
    this.logFlow = logFlow;
    this.requestTracker = requestTracker;
    this.responseInterceptor = responseInterceptor;
  }

  public handlers(): [RequestHandler, ErrorRequestHandler] {
    return [this.requestHandler.bind(this), this.errorHandler.bind(this)];
  }

  private requestHandler(req: Request, res: Response, next: NextFunction): void {
    const context = this.requestTracker.start(req);
    const locals = res.locals as LogFlowLocals;
    locals.__logflowContext = context;

    this.responseInterceptor.attach(req, res, context, (log: LifecycleLog) => {
      this.logFlow.enqueue(log);
    });

    next();
  }

  private errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
    const locals = res.locals as LogFlowLocals;
    if (locals.__logflowContext) {
      if (err instanceof Error) {
        locals.__logflowContext.errorMessage = err.message;
      } else {
        locals.__logflowContext.errorMessage = String(err);
      }
    }

    next(err as never);
  }
}
