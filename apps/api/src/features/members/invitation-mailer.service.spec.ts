import {
  buildSmtpMessage,
  parseSmtpMailbox,
} from "./invitation-mailer.service";

describe("InvitationMailerService SMTP helpers", () => {
  it("extracts a mailbox from an SMTP From header", () => {
    expect(parseSmtpMailbox("Tasks Dash <invite@example.com>")).toBe(
      "invite@example.com",
    );
  });

  it("rejects SMTP header injection", () => {
    expect(() =>
      parseSmtpMailbox("invite@example.com\r\nBcc: attacker@example.com"),
    ).toThrow("line breaks");
  });

  it("builds a UTF-8 multipart invitation message", () => {
    const message = buildSmtpMessage({
      from: "Tasks Dash <invite@example.com>",
      to: "member@example.com",
      subject: "Mời tham gia Không gian LCSP",
      text: "Accept: https://app.example.com/invite?token=abc",
      html: "<p>Accept invitation</p>",
    });

    expect(message).toContain("Content-Type: multipart/alternative");
    expect(message).toContain("Content-Type: text/plain; charset=UTF-8");
    expect(message).toContain("Content-Type: text/html; charset=UTF-8");
    expect(message).toContain("Content-Transfer-Encoding: base64");
    expect(message).toContain("To: member@example.com");
    expect(message).not.toContain("Mời tham gia");
  });
});
