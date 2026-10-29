import * as fs from 'fs';
import * as path from 'path';
import { DataSourceOptions } from 'typeorm';
import { InboundEntity } from '../entities/inbound.entity';
import { ItemEntity } from '../entities/item.entity';
import { OutboundEntity } from '../entities/outbound.entity';
import { ReceiverEntity } from '../entities/receiver.entity';
import { UserEntity } from '../entities/user.entity';

/**
 * TypeORM 数据源配置。
 * 运行时用 `DB_TYPE` 切换 SQLite / MySQL；`npm run seed` 等脚本复用同一份配置。
 */
export function dataSourceOptions(): DataSourceOptions {
  const type = (process.env.DB_TYPE ?? 'sqlite') as 'sqlite' | 'mysql';
  const entities = [UserEntity, ItemEntity, InboundEntity, OutboundEntity, ReceiverEntity];

  if (type === 'mysql') {
    return {
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: parseInt(process.env.DB_PORT ?? '3306', 10),
      username: process.env.DB_USERNAME ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'material_system',
      synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
      timezone: '+08:00',
      charset: 'utf8mb4',
      entities,
    };
  }

  const database = process.env.DB_DATABASE ?? './data/material-system.sqlite';
  fs.mkdirSync(path.dirname(path.resolve(process.cwd(), database)), { recursive: true });

  return {
    type: 'better-sqlite3',
    database,
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    entities,
  };
}
