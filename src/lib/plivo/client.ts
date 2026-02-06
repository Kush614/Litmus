import plivo from "plivo";

let client: plivo.Client | undefined;

export function getPlivoClient(): plivo.Client {
  if (!client) {
    const authId = process.env.PLIVO_AUTH_ID;
    const authToken = process.env.PLIVO_AUTH_TOKEN;
    if (!authId || !authToken) {
      throw new Error("PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN must be set");
    }
    client = new plivo.Client(authId, authToken);
  }
  return client;
}

export async function initiateCall(params: {
  to: string;
  agentId: string;
  answerUrl: string;
  hangupUrl: string;
}): Promise<{ requestUuid: string }> {
  const plivoClient = getPlivoClient();

  const call = await plivoClient.calls.create(
    process.env.PLIVO_PHONE_NUMBER!,
    params.to,
    params.answerUrl,
    {
      answerMethod: "POST",
      hangupUrl: params.hangupUrl,
      hangupMethod: "POST",
    }
  );

  const uuid = Array.isArray(call.requestUuid) ? call.requestUuid[0] : call.requestUuid;
  return { requestUuid: uuid };
}

export async function hangupCall(callUuid: string): Promise<void> {
  const plivoClient = getPlivoClient();
  await plivoClient.calls.hangup(callUuid);
}
