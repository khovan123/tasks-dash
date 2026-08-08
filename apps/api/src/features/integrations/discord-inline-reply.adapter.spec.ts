import { DiscordInlineReplyAdapter } from "./discord-inline-reply.adapter";

describe("DiscordInlineReplyAdapter", () => {
  function createAdapterWithBotRequest(botRequest: jest.Mock): DiscordInlineReplyAdapter {
    const adapter = Object.create(DiscordInlineReplyAdapter.prototype) as any;
    adapter.botRequest = botRequest;
    return adapter as DiscordInlineReplyAdapter;
  }

  it("posts replies to the parent channel instead of treating the message id as a channel id", async () => {
    const botRequest = jest.fn().mockResolvedValue({ id: "reply-456" });
    const adapter = createAdapterWithBotRequest(botRequest);

    const result = await adapter.sendThreadReply(
      "channel-123",
      "message-999",
      {
        title: "PR updated",
        description: "Checks completed",
      },
      null,
    );

    expect(result).toBe("reply-456");
    expect(botRequest).toHaveBeenCalledTimes(1);
    expect(botRequest).toHaveBeenCalledWith(
      "/channels/channel-123/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(botRequest).not.toHaveBeenCalledWith(
      "/channels/message-999/messages",
      expect.anything(),
    );

    const request = botRequest.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.message_reference).toEqual({
      message_id: "message-999",
      channel_id: "channel-123",
      fail_if_not_exists: false,
    });
  });

  it("keeps explicit Discord user mentions allowlisted", async () => {
    const botRequest = jest.fn().mockResolvedValue({ id: "reply-789" });
    const adapter = createAdapterWithBotRequest(botRequest);

    await adapter.sendThreadReply(
      "channel-123",
      "message-999",
      { title: "Assigned", description: "Reviewer requested" },
      "<@123456789012345678>",
    );

    const request = botRequest.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(request.body));
    expect(body.allowed_mentions).toEqual({
      parse: [],
      users: ["123456789012345678"],
    });
  });
});
