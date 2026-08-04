import { normalizeDiscordChannelName } from "./discord.adapter";

describe("normalizeDiscordChannelName", () => {
  it("renders project variables and normalizes a Discord text channel name", () => {
    expect(
      normalizeDiscordChannelName(
        "{{projectKey}}-{{projectName}}-updates",
        "LCSP",
        "Landing Page Sản Phẩm",
      ),
    ).toBe("lcsp-landing-page-san-pham-updates");
  });

  it("keeps custom project channel names within Discord's 100-character limit", () => {
    const value = normalizeDiscordChannelName("A".repeat(140), "TD", "Tasks Dash");
    expect(value).toHaveLength(100);
    expect(value).toMatch(/^[a-z0-9-_]+$/);
  });

  it("falls back to the project key when the rendered name is empty", () => {
    expect(normalizeDiscordChannelName("***", "TD", "Tasks Dash")).toBe(
      "td-updates",
    );
  });
});
