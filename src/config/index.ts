import { resolve } from 'node:path';

const CWD = process.cwd();
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_ENV_PROD = NODE_ENV === 'production';

const CONFIGS_DEFAULT = {
  CWD,
  HOST_SERVER: process.env.HOST_SERVER || '127.0.0.1',
  IS_ENV_DEV: NODE_ENV === 'development',
  IS_ENV_PROD,
  IS_ENV_TEST: NODE_ENV === 'test',
  LIMIT_BODY_REQUEST: Number(process.env.LIMIT_BODY_REQUEST || 2 * 1024 * 1024),
  LOG_LEVEL: process.env.LOG_LEVEL || (IS_ENV_PROD ? 'info' : 'debug'),
  NODE_ENV,
  PATH_STATIC: IS_ENV_PROD
    ? resolve(CWD, 'dist', process.env.PATH_STATIC || 'build')
    : resolve(__dirname, '../static'),
  PORT_SERVER: Number(process.env.PORT_SERVER || 3000),
};

export function getConfigs(configs = {}) {
  return {
    ...CONFIGS_DEFAULT,
    ...configs,
  };
}
