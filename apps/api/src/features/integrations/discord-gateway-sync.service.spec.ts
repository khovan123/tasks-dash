import {
  DiscordGatewaySyncService,
  discordGuildUpdateFromGateway,
} from "./discord-gateway-sync.service";

describe("DiscordGatewaySyncService", () => {
  it("extracts Discord GUILD_UPDATE rename events", () => {
    expect(
      discordGuildUpdateFromGateway({
        op: 0,
        t: "GUILD_UPDATE",
        s: 42,
        d: { id: "123456789012345678", name: "Renamed Server" },
      }),
    ).toEqual({
      guildId: "123456789012345678",
      guildName: "Renamed Server",
    });

    expect(
      discordGuildUpdateFromGateway({
        op: 0,
        t: "MESSAGE_CREATE",
        d: { id: "123456789012345678", name: "Ignored" },
      }),
    ).toBeNull();
  });

  it("persists a renamed Discord server by guild id", async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const updateOne = jest.fn().mockReturnValue({ exec });
    const service = new DiscordGatewaySyncService(
      { updateOne } as never,
      { get: jest.fn() } as never,
    );

    await service.syncGuildName(
      "123456789012345678",
      "Renamed Server",
    );

    expect(updateOne).toHaveBeenCalledWith(
      {
        guildId: "123456789012345678",
        guildName: { $ne: "Renamed Server" },
      },
      { $set: { guildName: "Renamed Server" } },
    );
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("routes a Gateway GUILD_UPDATE payload into the database sync", async () => {
    const exec = jest.fn().mockResolvedValue({ modifiedCount: 1 });
    const updateOne = jest.fn().mockReturnValue({ exec });
    const service = new DiscordGatewaySyncService(
      { updateOne } as never,
      { get: jest.fn() } as never,
    );

    await (service as any).handleMessage(
      JSON.stringify({
        op: 0,
        t: "GUILD_UPDATE",
        s: 77,
        d: { id: "987654321098765432", name: "Tasks Dash Team" },
      }),
    );

    expect(updateOne).toHaveBeenCalledWith(
      {
        guildId: "987654321098765432",
        guildName: { $ne: "Tasks Dash Team" },
      },
      { $set: { guildName: "Tasks Dash Team" } },
    );
  });
});
