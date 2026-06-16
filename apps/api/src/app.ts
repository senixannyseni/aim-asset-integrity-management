import express from 'express';
import helmet from 'helmet';
import pinoHttpModule from 'pino-http';
import { config } from './config/env.js';
import { demoRequestContext } from './middleware/request-context.js';
import { assetsRouter } from './routes/assets.js';
import { healthRouter } from './routes/health.js';
import { operationsRouter } from './routes/operations.js';
import { rbacDemoRouter } from './routes/rbac-demo.js';
import { evidenceRouter } from './routes/evidence.js';
import { ndtRouter } from './routes/ndt.js';
import { engineeringValidationRouter } from './routes/engineering-validation.js';

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
  app.use(demoRequestContext);

  app.use(healthRouter);
  app.use('/api/v1', assetsRouter);
  app.use('/api/v1', operationsRouter);
  app.use('/api/v1', rbacDemoRouter);
  app.use('/api/v1', evidenceRouter);
  app.use('/api/v1', ndtRouter);
  app.use('/api/v1', engineeringValidationRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message
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
