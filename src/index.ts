import PostalMime from "postal-mime";

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + "...";
}

function extractBody(parsed: Awaited<ReturnType<PostalMime["parse"]>>): string {
  if (parsed.text && parsed.text.trim().length > 0) {
    return parsed.text.trim();
  }
  if (parsed.html) {
    return parsed.html
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "(本文なし)";
}

export default {
  async email(message: ForwardableEmailMessage, env:any, ctx: ExecutionContext): Promise<void> {
    const parser = new PostalMime();
    const parsed = await parser.parse(message.raw);

    const subject = parsed.subject || message.headers.get("subject") || "(件名なし)";
    const fromHeader = parsed.from?.name
      ? `${parsed.from.name} <${parsed.from.address || message.from}>`
      : message.from;
    const body = extractBody(parsed);

    let ToAddress = message.headers.get("delivered-to") ?? 'Direct: todiscord@suitomizu.com'

    const payload = {
      embeds: [
        {
          title: truncate(subject, 256),
          description: truncate(body, 4000),
          color: 0x5865f2,
          fields: [
            {
              name: "From",
              value: truncate(fromHeader, 1024),
              inline: true,
            },
            {
              name: "To",
              value: truncate(ToAddress, 1024),
              inline: true,
            },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await fetch("<YOUR WEBHOOK URL>", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Discord Webhook failed: ${response.status} ${errorText}`);
    }
  },
};
