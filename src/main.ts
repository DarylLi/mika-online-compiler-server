import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 使用原生 WebSocket 适配器
  app.useWebSocketAdapter(new WsAdapter(app));

  // 启用 CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`🚀 服务器运行在 http://localhost:${port}`);
  logger.log(`📡 WebSocket 服务已启动 (原生 WebSocket)`);
}

bootstrap();

