import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MemberRole } from "@tasks-dash/contracts";
import { randomUUID } from "node:crypto";
import { connect as connectTcp, Socket } from "node:net";
import { connect as connectTls, TLSSocket } from "node:tls";

type SmtpSocket = Socket | TLSSocket;

interface SmtpReply {
  code: number;
  lines: string[];
}

interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  startTls: boolean;
  allowInsecure: boolean;
  username?: string;
  password?: string;
  from: string;
  heloName: string;
  timeoutMs: number;
}

interface SmtpWaiter {
  resolve: (reply: SmtpReply) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeHeader(value: string): string {
  if (/\r|\n/.test(value)) throw new Error("SMTP header values cannot contain line breaks.");
  return value.trim();
}

export function parseSmtpMailbox(value: string): string {
  const header = sanitizeHeader(value);
  const bracketed = header.match(/<([^<>]+)>$/);
  const mailbox = (bracketed?.[1] ?? header).trim();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(mailbox)) {
    throw new Error("SMTP mailbox is invalid.");
  }
  return mailbox;
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${Buffer.from(sanitizeHeader(value), "utf8").toString("base64")}?=`;
}

function foldBase64(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .match(/.{1,76}/g)
    ?.join("\r\n") ?? "";
}

export function buildSmtpMessage(input: {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}): string {
  const from = sanitizeHeader(input.from);
  const to = parseSmtpMailbox(input.to);
  const fromMailbox = parseSmtpMailbox(from);
  const messageDomain = fromMailbox.split("@")[1];
  const boundary = `tasks-dash-${randomUUID()}`;
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@${messageDomain}>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    foldBase64(input.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    foldBase64(input.html),
    `--${boundary}--`,
  ].join("\r\n");
}

class SmtpReplyReader {
  private buffer = "";
  private replyCode: string | null = null;
  private replyLines: string[] = [];
  private readonly queued: SmtpReply[] = [];
  private readonly waiters: SmtpWaiter[] = [];
  private readonly onData = (chunk: Buffer): void => this.consume(chunk);
  private readonly onError = (error: Error): void => this.fail(error);
  private readonly onClose = (): void => this.fail(new Error("SMTP connection closed unexpectedly."));

  constructor(private readonly socket: SmtpSocket) {
    socket.on("data", this.onData);
    socket.on("error", this.onError);
    socket.on("close", this.onClose);
  }

  next(timeoutMs: number): Promise<SmtpReply> {
    const queued = this.queued.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.waiters.findIndex((waiter) => waiter.timer === timer);
        if (index >= 0) this.waiters.splice(index, 1);
        reject(new Error("SMTP response timed out."));
      }, timeoutMs);
      this.waiters.push({ resolve, reject, timer });
    });
  }

  dispose(): void {
    this.socket.off("data", this.onData);
    this.socket.off("error", this.onError);
    this.socket.off("close", this.onClose);
    this.fail(new Error("SMTP response reader was disposed."));
  }

  private consume(chunk: Buffer): void {
    this.buffer += chunk.toString("utf8");
    let newline = this.buffer.indexOf("\n");
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      this.consumeLine(line);
      newline = this.buffer.indexOf("\n");
    }
  }

  private consumeLine(line: string): void {
    const match = line.match(/^(\d{3})([ -])(.*)$/);
    if (!match) {
      this.fail(new Error("SMTP server returned an invalid response."));
      return;
    }
    if (!this.replyCode) this.replyCode = match[1];
    if (match[1] !== this.replyCode) {
      this.fail(new Error("SMTP server returned inconsistent response codes."));
      return;
    }
    this.replyLines.push(line);
    if (match[2] !== " ") return;
    const reply: SmtpReply = {
      code: Number(this.replyCode),
      lines: this.replyLines,
    };
    this.replyCode = null;
    this.replyLines = [];
    const waiter = this.waiters.shift();
    if (waiter) {
      clearTimeout(waiter.timer);
      waiter.resolve(reply);
    } else {
      this.queued.push(reply);
    }
  }

  private fail(error: Error): void {
    while (this.waiters.length) {
      const waiter = this.waiters.shift();
      if (!waiter) continue;
      clearTimeout(waiter.timer);
      waiter.reject(error);
    }
  }
}

function connectEvent(
  socket: SmtpSocket,
  event: "connect" | "secureConnect",
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP connection timed out."));
    }, timeoutMs);
    const connected = (): void => {
      cleanup();
      resolve();
    };
    const failed = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const cleanup = (): void => {
      clearTimeout(timer);
      socket.off(event, connected);
      socket.off("error", failed);
    };
    socket.once(event, connected);
    socket.once("error", failed);
  });
}

async function command(
  socket: SmtpSocket,
  reader: SmtpReplyReader,
  value: string,
  acceptedCodes: number[],
  timeoutMs: number,
): Promise<SmtpReply> {
  socket.write(`${value}\r\n`);
  const reply = await reader.next(timeoutMs);
  if (!acceptedCodes.includes(reply.code)) {
    throw new Error(`SMTP command failed with ${reply.code}: ${reply.lines.join(" | ").slice(0, 500)}`);
  }
  return reply;
}

function capabilities(reply: SmtpReply): string {
  return reply.lines.map((line) => line.slice(4)).join(" ").toUpperCase();
}

async function authenticate(
  socket: SmtpSocket,
  reader: SmtpReplyReader,
  options: SmtpOptions,
  advertised: string,
): Promise<void> {
  if (!options.username || !options.password) return;
  if (!advertised.includes("AUTH")) {
    throw new Error("SMTP server does not advertise authentication support.");
  }
  if (advertised.includes("PLAIN")) {
    const token = Buffer.from(`\u0000${options.username}\u0000${options.password}`, "utf8").toString("base64");
    const reply = await command(socket, reader, `AUTH PLAIN ${token}`, [235, 334], options.timeoutMs);
    if (reply.code === 334) {
      await command(socket, reader, token, [235], options.timeoutMs);
    }
    return;
  }
  await command(socket, reader, "AUTH LOGIN", [334], options.timeoutMs);
  await command(
    socket,
    reader,
    Buffer.from(options.username, "utf8").toString("base64"),
    [334],
    options.timeoutMs,
  );
  await command(
    socket,
    reader,
    Buffer.from(options.password, "utf8").toString("base64"),
    [235],
    options.timeoutMs,
  );
}

function dotStuff(message: string): string {
  return message.replace(/(^|\r\n)\./g, "$1..");
}

async function deliverSmtp(
  options: SmtpOptions,
  recipient: string,
  message: string,
): Promise<void> {
  let socket: SmtpSocket;
  let reader: SmtpReplyReader;
  if (options.secure) {
    const secureSocket = connectTls({
      host: options.host,
      port: options.port,
      servername: options.host,
      rejectUnauthorized: true,
    });
    reader = new SmtpReplyReader(secureSocket);
    await connectEvent(secureSocket, "secureConnect", options.timeoutMs);
    socket = secureSocket;
  } else {
    const tcpSocket = connectTcp({ host: options.host, port: options.port });
    reader = new SmtpReplyReader(tcpSocket);
    await connectEvent(tcpSocket, "connect", options.timeoutMs);
    socket = tcpSocket;
  }

  socket.setTimeout(options.timeoutMs, () => {
    socket.destroy(new Error("SMTP socket timed out."));
  });

  try {
    await reader.next(options.timeoutMs).then((reply) => {
      if (reply.code !== 220) throw new Error(`SMTP greeting failed with ${reply.code}.`);
    });
    let ehlo = await command(socket, reader, `EHLO ${options.heloName}`, [250], options.timeoutMs);

    if (!options.secure && options.startTls) {
      if (!capabilities(ehlo).includes("STARTTLS")) {
        throw new Error("SMTP server does not advertise STARTTLS.");
      }
      await command(socket, reader, "STARTTLS", [220], options.timeoutMs);
      reader.dispose();
      const tlsSocket = connectTls({
        socket: socket as Socket,
        servername: options.host,
        rejectUnauthorized: true,
      });
      reader = new SmtpReplyReader(tlsSocket);
      await connectEvent(tlsSocket, "secureConnect", options.timeoutMs);
      socket = tlsSocket;
      socket.setTimeout(options.timeoutMs, () => {
        socket.destroy(new Error("SMTP socket timed out."));
      });
      ehlo = await command(socket, reader, `EHLO ${options.heloName}`, [250], options.timeoutMs);
    } else if (!options.secure && !options.allowInsecure) {
      throw new Error("Refusing to send SMTP credentials over an insecure connection.");
    }

    await authenticate(socket, reader, options, capabilities(ehlo));
    await command(
      socket,
      reader,
      `MAIL FROM:<${parseSmtpMailbox(options.from)}>`,
      [250],
      options.timeoutMs,
    );
    await command(
      socket,
      reader,
      `RCPT TO:<${parseSmtpMailbox(recipient)}>`,
      [250, 251],
      options.timeoutMs,
    );
    await command(socket, reader, "DATA", [354], options.timeoutMs);
    socket.write(`${dotStuff(message)}\r\n.\r\n`);
    const delivered = await reader.next(options.timeoutMs);
    if (delivered.code !== 250) {
      throw new Error(`SMTP DATA failed with ${delivered.code}: ${delivered.lines.join(" | ").slice(0, 500)}`);
    }
    await command(socket, reader, "QUIT", [221], options.timeoutMs).catch(() => undefined);
  } finally {
    reader.dispose();
    if (!socket.destroyed) socket.destroy();
  }
}

function optionalString(config: ConfigService, key: string): string | undefined {
  const value = config.get<string>(key)?.trim();
  return value || undefined;
}

function smtpOptions(config: ConfigService): SmtpOptions {
  const secure = config.get<boolean>("SMTP_SECURE") ?? false;
  const apiUrl = new URL(config.getOrThrow<string>("API_PUBLIC_URL"));
  return {
    host: config.getOrThrow<string>("SMTP_HOST"),
    port: config.get<number>("SMTP_PORT") ?? (secure ? 465 : 587),
    secure,
    startTls: config.get<boolean>("SMTP_STARTTLS") ?? !secure,
    allowInsecure: config.get<boolean>("SMTP_ALLOW_INSECURE") ?? false,
    username: optionalString(config, "SMTP_USERNAME"),
    password: optionalString(config, "SMTP_PASSWORD"),
    from: config.getOrThrow<string>("SMTP_FROM"),
    heloName: optionalString(config, "SMTP_HELO_NAME") ?? apiUrl.hostname,
    timeoutMs: config.get<number>("SMTP_CONNECTION_TIMEOUT_MS") ?? 10_000,
  };
}

@Injectable()
export class InvitationMailerService {
  constructor(private readonly config: ConfigService) {}

  async send(input: {
    email: string;
    workspaceName: string;
    role: MemberRole;
    inviteUrl: string;
  }): Promise<void> {
    const options = smtpOptions(this.config);
    const subject = `Invitation to join ${input.workspaceName}`;
    const text = [
      `Join ${input.workspaceName}`,
      "",
      `You were invited to Tasks Dash with role ${input.role}.`,
      `Accept invitation: ${input.inviteUrl}`,
      "",
      "This one-time invitation expires automatically.",
    ].join("\n");
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Join ${escapeHtml(input.workspaceName)}</h1><p>You were invited to Tasks Dash with role <strong>${escapeHtml(input.role)}</strong>.</p><p><a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#6256f5;color:#fff;text-decoration:none">Accept invitation</a></p><p>This one-time invitation expires automatically.</p></div>`;
    const message = buildSmtpMessage({
      from: options.from,
      to: input.email,
      subject,
      text,
      html,
    });

    try {
      await deliverSmtp(options, input.email, message);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Unknown SMTP error";
      const safe = options.password ? raw.replaceAll(options.password, "[redacted]") : raw;
      throw new ServiceUnavailableException(
        `Invitation email delivery failed through SMTP: ${safe.slice(0, 600)}`,
      );
    }
  }
}
