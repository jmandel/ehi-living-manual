export interface Query {
  id: string;
  originalQuery: string;
  description?: string;
  chapterId: string;
  index: number;
}

export interface ProcessedQuery extends Query {
  results: any[] | null;
  columns: string[] | null;
  error: string | null;
}