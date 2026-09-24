import { z } from "zod";
import {
  UA_CLASSES,
  VIEWPORT_BUCKETS,
  WEB_VITAL_METRICS,
  WEB_VITAL_RATINGS,
} from "@/types/api";
import { isInternalPath } from "./analytics";

const clientIdField = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "clientId must be a UUID"
  );

const pathField = z
  .string()
  .refine(isInternalPath, "path must be a same-site absolute pathname");

const localeField = z.string().min(2).max(10);
const referrerField = z.string().max(500).nullable().optional();

const pageviewSchema = z.object({
  type: z.literal("pageview"),
  clientId: clientIdField,
  path: pathField,
  referrer: referrerField,
  locale: localeField,
  viewport: z.enum(VIEWPORT_BUCKETS),
  uaClass: z.enum(UA_CLASSES),
});

const webVitalSchema = z.object({
  type: z.literal("web-vital"),
  clientId: clientIdField,
  path: pathField,
  metric: z.enum(WEB_VITAL_METRICS),
  value: z.number().nonnegative(),
  rating: z.enum(WEB_VITAL_RATINGS),
  id: z.string().min(1).max(100),
});

export const analyticsEventSchema = z.discriminatedUnion("type", [
  pageviewSchema,
  webVitalSchema,
]);

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;
