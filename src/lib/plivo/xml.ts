import plivo from "plivo";

export function buildStreamResponse(params: {
  agentId: string;
  wsUrl: string;
  statusCallbackUrl: string;
}): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plivoResponse = new (plivo.Response as any)();

  plivoResponse.addSpeak(
    "Connected to Litmus voice evaluation. " +
      "You will now speak with the AI agent. " +
      "Say end evaluation when you are finished."
  );

  const streamElement = plivoResponse.addStream(`${params.wsUrl}?agent_id=${params.agentId}`);
  streamElement.addAttribute("keepCallAlive", "true");
  streamElement.addAttribute("bidirectional", "true");
  streamElement.addAttribute("contentType", "audio/x-mulaw;rate=8000");
  streamElement.addAttribute("streamTimeout", "600");
  streamElement.addAttribute("statusCallbackUrl", params.statusCallbackUrl);

  return plivoResponse.toXML();
}
