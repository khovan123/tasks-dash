const REQUIRED_KEYS = [
  "MONGODB_URI",
  "WEB_APP_URL",
  "API_PUBLIC_URL",
  "SESSION_SECRET",
  "INTEGRATION_ENCRYPTION_KEY",
  "WORKSPACE_BOOTSTRAP_SECRET",
  "RESEND_API_KEY",
  "INVITE_EMAIL_FROM",
  "GITHUB_OAUTH_CLIENT_ID",
  "GITHUB_OAUTH_CLIENT_SECRET",
  "GITHUB_OAUTH_CALLBACK_URL",
  "GITHUB_APP_ID",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_WEBHOOK_SECRET",
  "GOOGLE_DRIVE_CLIENT_ID",
  "GOOGLE_DRIVE_CLIENT_SECRET",
  "GOOGLE_DRIVE_REDIRECT_URI",
  "DISCORD_APPLICATION_ID",
  "DISCORD_BOT_TOKEN",
] as const;

function requiredString(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function validateUrl(value: string, key: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be an absolute URL.`);
  }
  if (!url.protocol.startsWith("http")) {
    throw new Error(`${key} must use http or https.`);
  }
}

export function validateEnvironment(input: Record<string, unknown>): Record<string, unknown> {
  const config = { ...input };
  config.NODE_ENV = typeof config.NODE_ENV === "string" ? config.NODE_ENV : "development";
  const numberValue = (key: string, fallback: number): number => {
    const raw = config[key];
    const value = raw === undefined || raw === "" ? fallback : Number(raw);
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${key} must be a positive integer.`);
    }
    config[key] = value;
    return value;
  };
  numberValue("API_PORT", 4000);
  numberValue("MONGODB_MIN_POOL_SIZE", 2);
  numberValue("MONGODB_MAX_POOL_SIZE", 20);
  numberValue("INVITE_TTL_HOURS", 72);

  if (config.NODE_ENV === "test") return config;

  for (const key of REQUIRED_KEYS) requiredString(config, key);

  const privateKey =
    typeof config.GITHUB_APP_PRIVATE_KEY_BASE64 === "string" && config.GITHUB_APP_PRIVATE_KEY_BASE64.trim()
      ? config.GITHUB_APP_PRIVATE_KEY_BASE64.trim()
      : typeof config.GITHUB_APP_PRIVATE_KEY === "string"
        ? config.GITHUB_APP_PRIVATE_KEY.trim()
        : "";
  if (!privateKey) {
    throw new Error("Missing GITHUB_APP_PRIVATE_KEY_BASE64 or GITHUB_APP_PRIVATE_KEY.");
  }

  const sessionSecret = requiredString(config, "SESSION_SECRET");
  if (sessionSecret.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters.");

  const bootstrapSecret = requiredString(config, "WORKSPACE_BOOTSTRAP_SECRET");
  if (bootstrapSecret.length < 32) {
    throw new Error("WORKSPACE_BOOTSTRAP_SECRET must contain at least 32 characters.");
  }

  const encryptionKey = Buffer.from(requiredString(config, "INTEGRATION_ENCRYPTION_KEY"), "base64");
  if (encryptionKey.length !== 32) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
  }

  if (!/^\d{17,20}$/.test(requiredString(config, "DISCORD_APPLICATION_ID"))) {
    throw new Error("DISCORD_APPLICATION_ID must be a Discord snowflake.");
  }

  validateUrl(requiredString(config, "WEB_APP_URL"), "WEB_APP_URL");
  validateUrl(requiredString(config, "API_PUBLIC_URL"), "API_PUBLIC_URL");
  validateUrl(requiredString(config, "GITHUB_OAUTH_CALLBACK_URL"), "GITHUB_OAUTH_CALLBACK_URL");
  validateUrl(requiredString(config, "GOOGLE_DRIVE_REDIRECT_URI"), "GOOGLE_DRIVE_REDIRECT_URI");

  if (Number(config.MONGODB_MIN_POOL_SIZE) > Number(config.MONGODB_MAX_POOL_SIZE)) {
    throw new Error("MONGODB_MIN_POOL_SIZE cannot exceed MONGODB_MAX_POOL_SIZE.");
  }

  return config;
}
