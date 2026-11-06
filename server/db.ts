import 'dotenv/config';
import sql from 'mssql';

export { sql };

function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta ${name} en server/.env`);
  return v;
}

/** SQLSERVER_SERVER puede venir como "host" o "host:puerto". */
function hostPort(): { host: string; port: number } {
  const raw = need('SQLSERVER_SERVER');
  const [host, port] = raw.split(':');
  return { host, port: port ? Number(port) : 1433 };
}

export function dbConfig(database: string): sql.config {
  const { host, port } = hostPort();
  return {
    user: need('SQLSERVER_USER'),
    password: need('SQLSERVER_PASSWORD'),
    server: host,
    port,
    database,
    connectionTimeout: 15000,
    requestTimeout: 20000,
    options: {
      encrypt: process.env.SQLSERVER_ENCRYPT !== 'false',
      trustServerCertificate: true // los SQL Server propios suelen usar certificado autofirmado
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };
}

export const DB_NAME = process.env.SQLSERVER_DATABASE || 'LinkGen';

let poolP: Promise<sql.ConnectionPool> | null = null;
export function getPool(): Promise<sql.ConnectionPool> {
  if (!poolP) {
    poolP = new sql.ConnectionPool(dbConfig(DB_NAME)).connect().catch((e) => {
      poolP = null; // permite reintentar en la siguiente petición
      throw e;
    });
  }
  return poolP;
}
