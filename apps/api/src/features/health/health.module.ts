import { Controller, Get, Module, ServiceUnavailableException } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { PublicRoute } from "../../common/auth-context";

@Controller("health")
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @PublicRoute()
  @Get()
  check(): { status: string; database: string; timestamp: string } {
    if (this.connection.readyState !== 1) {
      throw new ServiceUnavailableException("MongoDB is not connected.");
    }
    return {
      status: "UP",
      database: "CONNECTED",
      timestamp: new Date().toISOString(),
    };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
