import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MemberRole } from "@tasks-dash/contracts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.getOrThrow<string>("RESEND_API_KEY")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.getOrThrow<string>("INVITE_EMAIL_FROM"),
        to: [input.email],
        subject: `Invitation to join ${input.workspaceName}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1>Join ${escapeHtml(input.workspaceName)}</h1><p>You were invited to Tasks Dash with role <strong>${escapeHtml(input.role)}</strong>.</p><p><a href="${escapeHtml(input.inviteUrl)}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#6256f5;color:#fff;text-decoration:none">Accept invitation</a></p><p>This one-time invitation expires automatically.</p></div>`,
      }),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new ServiceUnavailableException(
        `Invitation email delivery failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}.`,
      );
    }
  }
}
