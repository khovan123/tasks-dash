import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ApiEnvelopeInterceptor } from "./common/api-envelope.interceptor";
import { GlobalProblemFilter } from "./common/global-problem.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    abortOnError: true,
  });
  const config = app.get(ConfigService);
  const webAppUrl = new URL(
    config.getOrThrow<string>("WEB_APP_URL"),
  ).origin;

  app.setGlobalPrefix("api");
  app.enableCors({
    origin: [webAppUrl],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["content-type", "authorization", "x-request-id"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: false,
    }),
  );
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  app.useGlobalFilters(new GlobalProblemFilter());

  if (config.get<string>("SWAGGER_ENABLED") === "true") {
    const swagger = new DocumentBuilder()
      .setTitle("Tasks Dash API")
      .setVersion("1.0.0")
      .addCookieAuth("tasks_dash_session")
      .build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, swagger));
  }

  app.enableShutdownHooks();
  await app.listen(config.get<number>("API_PORT", 4000), "0.0.0.0");
}

void bootstrap();
