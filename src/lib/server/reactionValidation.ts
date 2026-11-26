import { z } from "zod";
import { REACTION_TYPES } from "@/types/api";

/** 浏览器生成的 client_id：仅接受 UUID v4 字符串。 */
export const clientIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "client_id must be a UUID"
  );

/** 投票请求体：互动类型必填，client_id 可选。 */
export const voteBodySchema = z.object({
  reaction: z.enum(REACTION_TYPES),
  client_id: clientIdSchema.optional(),
});

/** 查询参数中的互动类型校验。 */
export const reactionParamSchema = z.enum(REACTION_TYPES);

export type VoteBodyInput = z.infer<typeof voteBodySchema>;
