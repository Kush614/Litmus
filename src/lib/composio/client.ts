import { Composio } from "@composio/core";

let client: Composio | undefined;

export function getComposioClient(): Composio {
  if (!client) {
    const apiKey = process.env.COMPOSIO_API_KEY;
    if (!apiKey) {
      throw new Error("COMPOSIO_API_KEY environment variable is not set");
    }
    client = new Composio({ apiKey });
  }
  return client;
}
