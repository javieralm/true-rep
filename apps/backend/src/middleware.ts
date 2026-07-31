import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Nota: mantener en sync con las rutas dentro de (dashboard) y /admin — un
// route group nuevo aquí sin agregarlo a este matcher pierde el auth.protect()
// de edge (aunque layout.tsx + cada API route igual exigen sesión/rol).
const isDashboardRoute = createRouteMatcher([
  "/routines(.*)",
  "/clients(.*)",
  "/exercises(.*)",
  "/programs(.*)",
  "/settings(.*)",
  "/analytics(.*)",
]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Las rutas /api gestionan su propia auth (requireUser); el dashboard exige sesión
  if (isDashboardRoute(req) || isAdminRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)", "/__clerk/:path*"],
};
