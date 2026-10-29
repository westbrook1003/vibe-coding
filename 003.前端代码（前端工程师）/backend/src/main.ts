import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string[]>('app.corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 剔除 DTO 未声明的字段
      forbidNonWhitelisted: false,
      transform: true, // 按 DTO 类型自动转换
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('物资出入库管理系统 API')
    .setDescription(
      '依据《物资系统-产品需求文档 PRD v1.0》实现。\n' +
        '默认账号 admin / admin（首次登录后强制改密）。',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = config.get<number>('app.port');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`🚀 物资系统后端已启动：http://localhost:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`📖 接口文档：http://localhost:${port}/api-docs`);
}

void bootstrap();
