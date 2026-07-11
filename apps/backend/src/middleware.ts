import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isDashboardRoute = createRouteMatcher(["/routines(.*)", "/settings(.*)", "/analytics(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Las rutas /api gestionan su propia auth (requireUser); el dashboard exige sesión
  if (isDashboardRoute(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/api/(.*)"],
};
