import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const redisUri = this.config.get<string>("REDIS_URI", "redis://127.0.0.1:6379");
    this.client = new Redis(redisUri, {
      maxRetriesPerRequest: 3,
    });
    this.client.on("error", (err) => {
      // Gracefully catch to avoid Unhandled error event crash
      console.warn("Redis error:", err.message);
    });
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }
}
