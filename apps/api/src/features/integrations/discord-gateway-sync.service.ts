import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  DiscordWorkspaceDocument,
  DiscordWorkspaceHydratedDocument,
} from "./integration.schemas";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_GATEWAY_URL = "wss://gateway.discord.gg/?v=10&encoding=json";
const DISCORD_GUILDS_INTENT = 1;

interface DiscordGatewayPayload {
  op: number;
  d?: unknown;
  s?: number | null;
  t?: string | null;
}

interface DiscordGuildSummary {
  id: string;
  name: string;
}

export interface DiscordGuildUpdate {
  guildId: string;
  guildName: string;
}

export function discordGuildUpdateFromGateway(
  value: unknown,
): DiscordGuildUpdate | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as DiscordGatewayPayload;
  if (payload.op !== 0 || payload.t !== "GUILD_UPDATE") return null;
  if (!payload.d || typeof payload.d !== "object") return null;

  const guild = payload.d as { id?: unknown; name?: unknown };
  if (typeof guild.id !== "string" || typeof guild.name !== "string") {
    return null;
  }

  const guildId = guild.id.trim();
  const guildName = guild.name.trim();
  if (!guildId || !guildName) return null;

  return { guildId, guildName };
}

@Injectable()
export class DiscordGatewaySyncService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(DiscordGatewaySyncService.name);
  private socket: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sequence: number | null = null;
  private awaitingHeartbeatAck = false;
  private reconnectAttempt = 0;
  private stopped = false;

  constructor(
    @InjectModel(DiscordWorkspaceDocument.name)
    private readonly workspaces: Model<DiscordWorkspaceHydratedDocument>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<string>("DISCORD_BOT_TOKEN")) {
      this.logger.warn(
        "DISCORD_BOT_TOKEN is not configured; Discord guild rename sync is disabled.",
      );
      return;
    }
    this.connect();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.clearHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    const socket = this.socket;
    this.socket = null;
    if (socket && socket.readyState < WebSocket.CLOSING) {
      socket.close(1000, "Tasks Dash shutdown");
    }
  }

  async syncGuildName(guildId: string, guildName: string): Promise<boolean> {
    const result = await this.workspaces
      .updateOne(
        { guildId, guildName: { $ne: guildName } },
        { $set: { guildName } },
      )
      .exec();
    const changed = result.modifiedCount > 0;
    if (changed) {
      this.logger.log(`Synced Discord server rename guild=${guildId} name=${guildName}`);
    }
    return changed;
  }

  private connect(): void {
    if (this.stopped || this.socket) return;

    this.logger.log("Connecting Discord Gateway for guild metadata sync.");
    const socket = new WebSocket(DISCORD_GATEWAY_URL);
    this.socket = socket;

    socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });
    socket.addEventListener("close", () => {
      if (this.socket === socket) this.socket = null;
      this.clearHeartbeat();
      if (!this.stopped) this.scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      this.logger.warn("Discord Gateway connection error; reconnect will follow.");
    });
  }

  private async handleMessage(data: unknown): Promise<void> {
    const text = await this.messageText(data);
    if (!text) return;

    let payload: DiscordGatewayPayload;
    try {
      payload = JSON.parse(text) as DiscordGatewayPayload;
    } catch {
      this.logger.warn("Ignoring malformed Discord Gateway payload.");
      return;
    }

    if (typeof payload.s === "number") this.sequence = payload.s;

    const guildUpdate = discordGuildUpdateFromGateway(payload);
    if (guildUpdate) {
      await this.syncGuildName(guildUpdate.guildId, guildUpdate.guildName).catch(
        (error) => {
          this.logger.error(
            `Failed to persist Discord guild rename: ${String(error)}`,
          );
        },
      );
    }

    if (payload.op === 10) {
      const hello = payload.d as { heartbeat_interval?: unknown } | undefined;
      const interval = Number(hello?.heartbeat_interval);
      if (!Number.isFinite(interval) || interval <= 0) {
        this.logger.warn("Discord Gateway HELLO did not include heartbeat interval.");
        return;
      }
      this.scheduleHeartbeat(interval);
      this.identify();
      return;
    }

    if (payload.op === 11) {
      this.awaitingHeartbeatAck = false;
      return;
    }

    if (payload.op === 1) {
      this.sendHeartbeat();
      return;
    }

    if (payload.op === 7 || payload.op === 9) {
      if (payload.op === 9) this.sequence = null;
      this.socket?.close(4000, "Discord Gateway reconnect requested");
      return;
    }

    if (payload.op === 0 && payload.t === "READY") {
      this.reconnectAttempt = 0;
      void this.syncAllGuildNames();
    }
  }

  private identify(): void {
    const token = this.config.get<string>("DISCORD_BOT_TOKEN");
    if (!token) return;
    this.sendPayload({
      op: 2,
      d: {
        token,
        intents: DISCORD_GUILDS_INTENT,
        properties: {
          os: process.platform,
          browser: "tasks-dash",
          device: "tasks-dash",
        },
      },
    });
  }

  private scheduleHeartbeat(interval: number): void {
    this.clearHeartbeat();
    const initialDelay = Math.max(250, Math.floor(Math.random() * interval));
    const tick = (delay: number) => {
      this.heartbeatTimer = setTimeout(() => {
        if (this.awaitingHeartbeatAck) {
          this.logger.warn("Discord Gateway heartbeat ACK timed out; reconnecting.");
          this.socket?.close(4000, "Heartbeat ACK timeout");
          return;
        }
        this.sendHeartbeat();
        tick(interval);
      }, delay);
    };
    tick(initialDelay);
  }

  private sendHeartbeat(): void {
    this.sendPayload({ op: 1, d: this.sequence });
    this.awaitingHeartbeatAck = true;
  }

  private sendPayload(payload: unknown): void {
    if (this.socket?.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(payload));
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.awaitingHeartbeatAck = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.stopped) return;
    const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt = Math.min(this.reconnectAttempt + 1, 5);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private async syncAllGuildNames(): Promise<void> {
    const token = this.config.get<string>("DISCORD_BOT_TOKEN");
    if (!token) return;

    try {
      const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: {
          authorization: `Bot ${token}`,
          accept: "application/json",
          "user-agent": "Tasks-Dash/1.0",
        },
      });
      if (!response.ok) {
        this.logger.warn(
          `Discord guild metadata reconciliation failed with HTTP ${response.status}.`,
        );
        return;
      }
      const guilds = (await response.json()) as DiscordGuildSummary[];
      for (const guild of guilds) {
        if (guild?.id && guild?.name) {
          await this.syncGuildName(guild.id, guild.name);
        }
      }
    } catch (error) {
      this.logger.warn(
        `Discord guild metadata reconciliation failed: ${String(error)}`,
      );
    }
  }

  private async messageText(data: unknown): Promise<string | null> {
    if (typeof data === "string") return data;
    if (data instanceof ArrayBuffer) {
      return Buffer.from(data).toString("utf8");
    }
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      return data.text();
    }
    return null;
  }
}
