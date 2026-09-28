import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@truerep/shared"],

  // No anunciar la versión del framework en cada respuesta.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Sin sniffing de tipos: un upload servido como text/plain no debe
          // poder reinterpretarse como script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // El dashboard no se embebe en ningún sitio: nadie debería poder
          // meterlo en un iframe para hacer clickjacking sobre sus acciones.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Sin acceso a cámara/micro/geo desde la web (el móvil es quien graba).
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// ponytail: sin CSP. Una CSP correcta aquí tiene que permitir los scripts de
// Clerk y Stripe, y una mal puesta rompe el login y el checkout en producción
// sin avisar en build. Se añade cuando se pueda verificar en un navegador real
// contra el dominio final, no a ciegas.
export default nextConfig;
