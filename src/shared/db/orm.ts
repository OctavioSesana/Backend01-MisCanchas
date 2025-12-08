import { MikroORM } from '@mikro-orm/core';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqlHighlighter } from '@mikro-orm/sql-highlighter';

const commonConfig = {
  entities: ['dist/**/*.entity.js'],
  entitiesTs: ['src/**/*.entity.ts'],
  driver: MySqlDriver,
  highlighter: new SqlHighlighter(),
  debug: true,
  schemaGenerator: {
    disableForeignKeys: true,
    createForeignKeyConstraints: true,
    ignoreSchema: [],
  },
};

export const orm = await MikroORM.init(
  process.env.MYSQL_URL
    ? {
        ...commonConfig,
        clientUrl: process.env.MYSQL_URL,   // ✅ Railway
      }
    : {
        ...commonConfig,
        dbName: process.env.DB_NAME || 'proyectbooking',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Tati1234',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
      }
);

export const syncSchema = async () => {
  const generator = orm.getSchemaGenerator();
  await generator.updateSchema();
};