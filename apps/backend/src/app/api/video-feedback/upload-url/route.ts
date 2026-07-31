import { ok, handler } from "@/lib/api";
import { requirePremium } from "@/lib/auth";
import { signedUploadParams } from "@/lib/cloudinary";

export const POST = handler(async () => {
  const user = await requirePremium();
  return ok(signedUploadParams(user.id));
});
