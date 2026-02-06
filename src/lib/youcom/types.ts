export type YouSearchResult = {
  url: string;
  title: string;
  description: string;
  snippets: string[];
  page_age: string;
  thumbnail_url: string;
  favicon_url: string;
};

export type YouNewsResult = {
  url: string;
  title: string;
  description: string;
  page_age: string;
  thumbnail_url: string;
};

export type YouSearchResponse = {
  results: {
    web: YouSearchResult[];
    news: YouNewsResult[];
  };
  metadata: {
    request_uuid: string;
    query: string;
    latency: number;
  };
};

export type YouContentResponse = {
  url: string;
  title: string;
  content: string;
};

export type SearchOptions = {
  count?: number;
  freshness?: "day" | "week" | "month" | "year";
  country?: string;
};

export type NewsOptions = {
  count?: number;
  freshness?: "day" | "week" | "month";
};
