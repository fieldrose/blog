/**
 * BFF 路由与客户端 island 共用的 API 契约。
 * 该模块不得引入任何仅服务端可用的依赖。
 */

export const REACTION_TYPES = ["like", "fire", "idea", "question"] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

/** 四种反馈的计数字段，始终补零，便于 UI 静态渲染。 */
export type ReactionCounts = Record<ReactionType, number>;

/** GET /api/reactions/:slug 的响应体 */
export interface ReactionsResponse {
  counts: ReactionCounts;
  /** 调用方（登录用户或匿名客户端）已选择的反馈类型。 */
  selected: ReactionType[];
}

/** POST /api/reactions/:slug 的请求体 */
export interface ReactionVoteBody {
  reaction: ReactionType;
  /** 匿名投票时必填（由浏览器生成的 UUID v4）。 */
  client_id?: string;
}

/** GET /api/reactions/totals —— 全站聚合计数。 */
export interface ReactionTotalsResponse {
  totals: ReactionCounts;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "POST_NOT_FOUND"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "SUPABASE_NOT_CONFIGURED"
  | "INTERNAL_ERROR";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

/** 携带匿名设备 id 的请求头（存于 localStorage 的 UUID v4）。 */
export const CLIENT_ID_HEADER = "x-client-id";
