import { z } from "zod";

export const startLivestreamSchema = z.object({
  audio_enabled: z.boolean().optional().default(true),
  max_viewers: z.number().int().min(1).max(100).optional().default(30),
});

export const livestreamSessionSchema = z.object({
  session_id: z.string().uuid(),
});

export const livestreamSignalSchema = z.object({
  session_id: z.string().uuid(),
  to_user_id: z.string().uuid(),
  signal_type: z.enum(["offer", "answer", "ice_candidate", "leave"]),
  payload: z.unknown().optional().default({}),
});

export type StartLivestreamInput = z.infer<typeof startLivestreamSchema>;
export type LivestreamSessionInput = z.infer<typeof livestreamSessionSchema>;
export type LivestreamSignalInput = z.infer<typeof livestreamSignalSchema>;
