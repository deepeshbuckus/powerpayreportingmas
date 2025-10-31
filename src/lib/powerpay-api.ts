// powerpay-api.ts
// Lightweight client for the PowerPay Reports API (OpenAPI 3.1)

export type UUID = string;

export interface SaveReportRequest {
  report_id?: UUID;
  name?: string;
  description?: string;
}

export interface ReportResponse {
  report_id?: UUID;
  name?: string;
  description?: string;
}

export interface ConversationRequest {
  prompt?: string;
}

export interface ConversationMessage {
  message_id?: UUID;
  prompt?: string;
  response?: string[][];
  role?: string;
  // New enhanced format
  content?: string[];
  summary?: string;
  comprehensive_information?: string;
  key_insights?: string[];
  suggested_prompts?: string[];
}

export interface ConversationResponse {
  report_id?: UUID;
  messages?: ConversationMessage[];
}

export interface ReportDataResponse {
  data?: string[][];
}

export type GetToken = () => string | Promise<string | null> | null;

export interface PowerPayApiOptions {
  baseUrl?: string;             // default: http://localhost:8383
  getToken?: GetToken;          // async or sync; returns JWT (without "Bearer ")
  token?: string;               // optional hardcoded token (takes priority over getToken)
  fetchFn?: typeof fetch;       // for SSR/testing
  onUnauthorized?: () => void;  // optional hook when a 401 occurs
}

// A thin wrapper around fetch that adds JSON, auth header, and error handling.
export class PowerPayApi {
  private baseUrl: string;
  private getToken?: GetToken;
  private token?: string;
  private fetchFn: typeof fetch;
  private onUnauthorized?: () => void;

  constructor(opts: PowerPayApiOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? "http://localhost:8383").replace(/\/+$/, "");
    this.getToken = opts.getToken;
    this.token = opts.token;
    this.fetchFn = opts.fetchFn ?? fetch.bind(window);
    this.onUnauthorized = opts.onUnauthorized;
  }

  private async authHeader(): Promise<Record<string, string>> {
    // Prioritize hardcoded token if provided
    if (this.token) {
      return { Authorization: `Bearer ${this.token}` };
    }
    if (!this.getToken) return {};
    const token = await this.getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    signal?: AbortSignal
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      ...(await this.authHeader()),
    };

    const init: RequestInit = { method, headers, signal };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }

    const res = await this.fetchFn(url, init);

    if (res.status === 401 && this.onUnauthorized) {
      try { this.onUnauthorized(); } catch {}
    }

    if (!res.ok) {
      // Try to surface JSON error payloads, else plain text
      let details: unknown;
      try { details = await res.clone().json(); }
      catch { try { details = await res.text(); } catch { details = null; } }
      throw new PowerPayHttpError(res.status, res.statusText, details);
    }

    // No content?
    if (res.status === 204) return undefined as unknown as T;

    // Some endpoints might respond */*; assume JSON
    const text = await res.text();
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // If server didn't send JSON, fallback to text
      return text as unknown as T;
    }
  }

  // --- Endpoints ---

  /** GET /reports */
  getReports(signal?: AbortSignal) {
    return this.request<ReportResponse[]>("GET", `/reports`, undefined, signal);
  }

  /** POST /reports */
  saveReport(req: SaveReportRequest, signal?: AbortSignal) {
    return this.request<ReportResponse>("POST", `/reports`, req, signal);
  }

  /** POST /conversations/start */
  startConversation(req: ConversationRequest, signal?: AbortSignal) {
    return this.request<ConversationResponse>("POST", `/conversations/start`, req, signal);
  }

  /** POST /conversations/{reportId}/continue */
  continueConversation(reportId: UUID, req: ConversationRequest, signal?: AbortSignal) {
    return this.request<ConversationResponse>("POST", `/conversations/${reportId}/continue`, req, signal);
  }

  /** GET /conversations/{reportId}/messages */
  getConversationMessages(reportId: UUID, signal?: AbortSignal) {
    return this.request<ConversationResponse>("GET", `/conversations/${reportId}/messages`, undefined, signal);
  }

  /** GET /conversations/{reportId}/messages/{messageId}/data */
  getReportData(reportId: UUID, messageId: UUID, signal?: AbortSignal) {
    return this.request<ReportDataResponse>("GET", `/conversations/${reportId}/messages/${messageId}/data`, undefined, signal);
  }

  /** GET /.well-known/jwks.json (usually not needed by a UI) */
  getJwks(signal?: AbortSignal) {
    return this.request<Record<string, unknown>>("GET", `/.well-known/jwks.json`, undefined, signal);
  }
}

export class PowerPayHttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, statusText: string, details?: unknown) {
    super(`${status} ${statusText}`);
    this.name = "PowerPayHttpError";
    this.status = status;
    this.details = details;
  }
}
