import { z } from "zod";

export const inviteAuctionManagerSchema = z.object({
  manager_user_id: z.string().uuid("Manager user id must be a valid UUID"),
  can_edit: z.boolean().optional().default(true),
  can_stream: z.boolean().optional().default(true),
});

export type InviteAuctionManagerInput = z.infer<typeof inviteAuctionManagerSchema>;
