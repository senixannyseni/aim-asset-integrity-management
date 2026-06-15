import express from 'express';
import helmet from 'helmet';
import pinoHttpModule from 'pino-http';
import { demoRequestContext } from './middleware/request-context.js';
import { healthRouter } from './routes/health.js';
import { rbacDemoRouter } from './routes/rbac-demo.js';

const pinoHttp = pinoHttpModule as unknown as () => express.RequestHandler;

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(pinoHttp());
  app.use(demoRequestContext);

  app.use(healthRouter);
  app.use('/api/v1', rbacDemoRouter);

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
