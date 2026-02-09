import { z } from "zod";

export const sendDealMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(2000, "Message is too long"),
});

export type SendDealMessageInput = z.infer<typeof sendDealMessageSchema>;
