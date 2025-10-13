import { getConfigs } from '@config';
import { cors, express, ExpressAdapter, json, urlencoded } from '@express';
import { ServerHTTP } from '@http';
import { logger } from '@logger';
import { serveStatic } from '@middlewares';
import { routerBase } from '@routes';

const { HOST_SERVER, LIMIT_BODY_REQUEST, PATH_STATIC, PORT_SERVER } =
  getConfigs();

const app = express();

app.use(cors());
app.use(json());
app.use(urlencoded());
app.use('/api', routerBase);
app.use(serveStatic(PATH_STATIC));

const server = new ServerHTTP(
  HOST_SERVER,
  PORT_SERVER,
  LIMIT_BODY_REQUEST,
  new ExpressAdapter(app, logger),
  logger
);

server.start();

async function onSignal() {
  logger.info({ event: 'signal', message: 'shutting down...' });

  try {
    process.stdin.pause();
    await server.stop({ msGrace: 300, msKill: 3000 });
  } catch {
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

process.on('uncaughtException', (e: any) => {
  if (e?.code === 'ECONNRESET') {
    return;
  }

  logger.error({ error: e?.message || e, event: 'uncaught_exception' });
});

process.on('unhandledRejection', (e: any) => {
  logger.error({ error: e?.message || e, event: 'unhandled_rejection' });
});
