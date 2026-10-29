import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { configs } from './config/configuration';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ItemModule } from './modules/item/item.module';
import { InboundModule } from './modules/inbound/inbound.module';
import { OutboundModule } from './modules/outbound/outbound.module';
import { ReceiverModule } from './modules/receiver/receiver.module';
import { StockModule } from './modules/stock/stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: configs, envFilePath: ['.env'] }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get<{
          type: 'sqlite' | 'mysql';
          database: string;
          host: string;
          port: number;
          username: string;
          password: string;
          synchronize: boolean;
        }>('database');

        // SQLite 的文件所在目录需要先创建
        if (db.type === 'sqlite') {
          const dir = path.dirname(path.resolve(process.cwd(), db.database));
          fs.mkdirSync(dir, { recursive: true });
        }

        return db.type === 'mysql'
          ? {
              type: 'mysql' as const,
              host: db.host,
              port: db.port,
              username: db.username,
              password: db.password,
              database: db.database,
              synchronize: db.synchronize,
              autoLoadEntities: true,
              timezone: '+08:00',
              charset: 'utf8mb4',
            }
          : {
              type: 'better-sqlite3' as const,
              database: db.database,
              synchronize: db.synchronize,
              autoLoadEntities: true,
            };
      },
    }),

    AuthModule,
    UserModule,
    ItemModule,
    InboundModule,
    OutboundModule,
    ReceiverModule,
    StockModule,
  ],
  providers: [
    // 守卫顺序：先鉴权，再校验角色
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
