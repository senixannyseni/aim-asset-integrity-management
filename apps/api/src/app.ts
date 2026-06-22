import express from 'express';
import helmet from 'helmet';
import pinoHttpModule from 'pino-http';
import { config } from './config/env.js';
import { authenticateRequest } from './middleware/request-context.js';
import { assetsRouter } from './routes/assets.js';
import { healthRouter } from './routes/health.js';
import { operationsRouter } from './routes/operations.js';
import { rbacDemoRouter } from './routes/rbac-demo.js';
import { evidenceRouter } from './routes/evidence.js';
import { ndtRouter } from './routes/ndt.js';
import { engineeringValidationRouter } from './routes/engineering-validation.js';
import { formulasRouter } from './routes/formulas.js';
import { calculationsRouter } from './routes/calculations.js';
import { ffsRouter } from './routes/ffs.js';
import { rbiRouter } from './routes/rbi.js';
import { engineeringReviewsRouter } from './routes/engineering-reviews.js';
import { reportsRouter } from './routes/reports.js';
import { workOrdersRouter } from './routes/work-orders.js';
import { aiExtractionRouter } from "./routes/ai-extraction.js";
import { authRouter } from "./routes/auth.js";

const pinoHttp = pinoHttpModule as unknown as () => express.RequestHandler;

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', config.corsOrigin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-aim-demo-roles, x-aim-demo-user-id, x-aim-demo-email, x-request-id');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp());
  app.use(authenticateRequest);

  app.use(healthRouter);
  app.use('/api/v1', assetsRouter);
  app.use('/api/v1', operationsRouter);
  app.use('/api/v1', rbacDemoRouter);
  app.use('/api/v1', evidenceRouter);
  app.use('/api/v1', ndtRouter);
  app.use('/api/v1', engineeringValidationRouter);
  app.use('/api/v1', formulasRouter);
  app.use('/api/v1', calculationsRouter);
  app.use('/api/v1', ffsRouter);
  app.use('/api/v1', rbiRouter);
  app.use('/api/v1', engineeringReviewsRouter);
  app.use('/api/v1', reportsRouter);
  app.use('/api/v1', workOrdersRouter);
  app.use('/api/v1', aiExtractionRouter);
  app.use('/api/v1', authRouter);
  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const statusCode = typeof (error as { statusCode?: unknown })?.statusCode === 'number'
      ? Number((error as { statusCode: number }).statusCode)
      : 500;
    const safeStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;
    const isLocal = config.appEnv === 'local' || config.appEnv === 'development' || config.appEnv === 'test';
    const rawMessage = error instanceof Error ? error.message : 'Unknown server error.';
    res.status(safeStatus).json({
      error: {
        code: safeStatus === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED',
        message: safeStatus === 500 && !isLocal ? 'Internal server error.' : rawMessage,
        requestId: req.header('x-request-id') ?? undefined,
        ...(isLocal && error instanceof Error ? { details: { name: error.name, stack: error.stack } } : {})
      }
    });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.'
      }
    });
  });

  return app;
}
