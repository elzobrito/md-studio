export interface FormatRequest {
  language: string;
  code: string;
}

export interface FormatResponse {
  formatted: boolean;
  code: string;
  formatter: string;
  error?: string;
}
