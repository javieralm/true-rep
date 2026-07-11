import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** URL firmada para subida directa de video desde el móvil */
export function signedUploadParams(userId: string) {
  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `feedback/${userId}/${timestamp}`;
  const paramsToSign = { timestamp, public_id: publicId };
  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET ?? ""
  );
  return {
    upload_url: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload`,
    public_id: publicId,
    timestamp,
    signature,
    api_key: process.env.CLOUDINARY_API_KEY ?? "",
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
