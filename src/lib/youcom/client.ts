import type { YouSearchResponse, YouContentResponse, SearchOptions, NewsOptions } from "./types";

const BASE_URL = "https://api.ydc-index.io";

function getHeaders(): HeadersInit {
  const apiKey = process.env.YOUCOM_API_KEY;
  if (!apiKey) {
    throw new Error("YOUCOM_API_KEY environment variable is not set");
  }
  return { "X-API-Key": apiKey };
}

export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<YouSearchResponse> {
  const params = new URLSearchParams({ query });
  if (options.count) params.set("count", String(options.count));
  if (options.freshness) params.set("freshness", options.freshness);
  if (options.country) params.set("country", options.country);

  const response = await fetch(`${BASE_URL}/v1/search?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`You.com Search API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<YouSearchResponse>;
}

export async function fetchContent(url: string): Promise<YouContentResponse> {
  const params = new URLSearchParams({ url });

  const response = await fetch(`${BASE_URL}/v1/content?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`You.com Content API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<YouContentResponse>;
}

export async function searchNews(
  query: string,
  options: NewsOptions = {}
): Promise<YouSearchResponse> {
  const params = new URLSearchParams({ query });
  if (options.count) params.set("count", String(options.count));
  if (options.freshness) params.set("freshness", options.freshness);

  const response = await fetch(`${BASE_URL}/news?${params}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`You.com News API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<YouSearchResponse>;
}
