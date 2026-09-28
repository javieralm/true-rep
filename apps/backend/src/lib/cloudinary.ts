import { v2 as cloudinary } from "cloudinary";
import { requireEnv } from "@/lib/env";

/** URL firmada para subida directa de video desde el móvil.
 *
 * La config va aquí y no al cargar el módulo: con las variables sin definir,
 * `api_sign_request` firmaba con un secreto vacío y devolvía una firma
 * inválida sin avisar — Cloudinary rechazaba la subida y el error aparecía en
 * el móvil, lejos de la causa real. */
export function signedUploadParams(userId: string) {
  const cloudName = requireEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = requireEnv("CLOUDINARY_API_KEY");
  const apiSecret = requireEnv("CLOUDINARY_API_SECRET");
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `feedback/${userId}/${timestamp}`;
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, public_id: publicId },
    apiSecret
  );
  return {
    upload_url: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    public_id: publicId,
    timestamp,
    signature,
    api_key: apiKey,
  };
}

/** Extrae N keyframes de un video Cloudinary como URLs de imagen */
export function keyframeUrls(videoUrl: string, count = 4): string[] {
  // ponytail: usa transformación so_ (start offset) en porcentajes fijos;
  // suficiente para el MVP, cambiar a análisis de escena si hace falta precisión
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const pct = Math.round((i / (count - 1)) * 90) + 5; // 5%..95%
    frames.push(
      videoUrl.replace("/upload/", `/upload/so_${pct}p,f_jpg,w_640/`).replace(/\.\w+$/, ".jpg")
    );
  }
  return frames;
}
