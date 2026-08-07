import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { RedisService } from "./redis.service";

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly LIMIT = 100; // Max 100 requests
  private readonly WINDOW_SECONDS = 60; // 1 minute (60 seconds)

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip checking for non-HTTP contexts
    if (context.getType() !== "http") {
      return true;
    }

    // Exempt localhost / Next.js Server Side Rendering requests
    const ip = request.ip;
    if (ip === "::1" || ip === "127.0.0.1" || ip === "::ffff:127.0.0.1") {
      return true;
    }

    // Identify client by session memberId if logged in, fallback to IP address
    const session = (request as any).session;
    const clientKey = session?.memberId || request.ip || "anonymous";

    const redis = this.redisService.getClient();
    const key = `ratelimit:${clientKey}`;

    const now = Date.now();
    const clearBefore = now - this.WINDOW_SECONDS * 1000;

    // Sliding window count using Sorted Sets in Redis
    const result = await redis
      .multi()
      .zremrangebyscore(key, 0, clearBefore)
      .zcard(key)
      .exec();

    if (!result) {
      return true;
    }

    // result[1] contains the ZCARD count result
    const currentRequests = result[1][1] as number;

    if (currentRequests >= this.LIMIT) {
      throw new HttpException(
        "Bạn thao tác quá nhanh. Xin vui lòng đợi.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current request timestamp and set TTL
    await redis
      .multi()
      .zadd(key, now, `${now}-${Math.random()}`)
      .expire(key, this.WINDOW_SECONDS)
      .exec();

    return true;
  }
}
