import { ok, handler } from "@/lib/api";
import { requireClientAccess } from "@/lib/auth";
import { signedUploadParams } from "@/lib/cloudinary";

export const POST = handler(async () => {
  const user = await requireClientAccess();
  return ok(signedUploadParams(user.id));
});
