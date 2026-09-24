import { z } from "zod";
import { REACTION_TYPES } from "@/types/api";

/** Browser-generated client_id: UUID v4 string only. */
export const clientIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "client_id must be a UUID"
  );

export const voteBodySchema = z.object({
  reaction: z.enum(REACTION_TYPES),
  client_id: clientIdSchema.optional(),
});

export const reactionParamSchema = z.enum(REACTION_TYPES);

export type VoteBodyInput = z.infer<typeof voteBodySchema>;
