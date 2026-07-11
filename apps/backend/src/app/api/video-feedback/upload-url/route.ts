import { ok, fail, handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { signedUploadParams } from "@/lib/cloudinary";

export const POST = handler(async () => {
  const user = await requireUser();
  // Feature gate: video feedback es premium
  if (user.subscription_status !== "ACTIVE")
    return fail("Premium subscription required for video feedback", 402);
  return ok(signedUploadParams(user.id));
});
