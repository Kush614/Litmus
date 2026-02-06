const BASE_URL = "https://api.intercom.io";

function getHeaders(): HeadersInit {
  const token = process.env.INTERCOM_ACCESS_TOKEN;
  if (!token) {
    throw new Error("INTERCOM_ACCESS_TOKEN environment variable is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Intercom-Version": "2.11",
  };
}

export async function searchConversations(query: {
  operator: string;
  value: Array<{ field: string; operator: string; value: string | number }>;
}) {
  const response = await fetch(`${BASE_URL}/conversations/search`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`Intercom API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getConversation(id: string) {
  const response = await fetch(`${BASE_URL}/conversations/${id}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Intercom API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function listTags() {
  const response = await fetch(`${BASE_URL}/tags`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Intercom API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
