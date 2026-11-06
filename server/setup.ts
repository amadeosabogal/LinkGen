// Crea la base de datos LinkGen y sus tablas. Es seguro ejecutarlo varias veces.
import { dbConfig, DB_NAME, sql } from './db.js';

async function main() {
  // 1) Base de datos (se crea desde "master")
  const master = await new sql.ConnectionPool(dbConfig('master')).connect();
  await master.request().query(`IF DB_ID(N'${DB_NAME}') IS NULL CREATE DATABASE [${DB_NAME}];`);
  await master.close();
  console.log(`✔ Base de datos "${DB_NAME}" lista`);

  // 2) Tablas
  const pool = await new sql.ConnectionPool(dbConfig(DB_NAME)).connect();
  await pool.request().batch(`
    IF OBJECT_ID(N'dbo.Usuarios', N'U') IS NULL
    CREATE TABLE dbo.Usuarios (
      Id        INT IDENTITY(1,1) PRIMARY KEY,
      Correo    NVARCHAR(255) NOT NULL,
      ClaveHash NVARCHAR(100) NOT NULL,
      CreadoEn  DATETIME2 NOT NULL CONSTRAINT DF_Usuarios_CreadoEn DEFAULT SYSUTCDATETIME(),
      CONSTRAINT UQ_Usuarios_Correo UNIQUE (Correo)
    );
  `);
  await pool.request().batch(`
    IF OBJECT_ID(N'dbo.Sitios', N'U') IS NULL
    CREATE TABLE dbo.Sitios (
      Enlace        NVARCHAR(40)  NOT NULL PRIMARY KEY,
      Datos         NVARCHAR(MAX) NOT NULL,
      UsuarioId     INT           NOT NULL,
      CreadoEn      DATETIME2     NOT NULL CONSTRAINT DF_Sitios_CreadoEn DEFAULT SYSUTCDATETIME(),
      ActualizadoEn DATETIME2     NOT NULL CONSTRAINT DF_Sitios_ActualizadoEn DEFAULT SYSUTCDATETIME(),
      CONSTRAINT CK_Sitios_Json CHECK (ISJSON(Datos) = 1),
      CONSTRAINT FK_Sitios_Usuario FOREIGN KEY (UsuarioId) REFERENCES dbo.Usuarios(Id) ON DELETE CASCADE
    );
  `);
  await pool.request().batch(`
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Sitios_Usuario' AND object_id = OBJECT_ID(N'dbo.Sitios'))
    CREATE INDEX IX_Sitios_Usuario ON dbo.Sitios (UsuarioId, ActualizadoEn DESC);
  `);
  console.log('✔ Tablas Usuarios y Sitios listas');

  const t = await pool.request().query(
    `SELECT TABLE_NAME, STRING_AGG(COLUMN_NAME, ', ') AS Columnas
     FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = 'dbo' GROUP BY TABLE_NAME ORDER BY TABLE_NAME`
  );
  for (const r of t.recordset) console.log(`  ${r.TABLE_NAME}: ${r.Columnas}`);
  await pool.close();
}

main().catch((e) => {
  console.error('✖ No pude preparar la base de datos:', e instanceof Error ? e.message : e);
  process.exit(1);
});
