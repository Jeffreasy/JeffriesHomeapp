import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Public routes — everything else is protected
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/schedule(.*)", // GAS sync webhook stays public
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      // For API requests, return a 401 response instead of a redirect —
      // a redirect makes fetch() land on the sign-in HTML with status 200,
      // which the client would then fail to parse as JSON (FH4). The `detail`
      // key matches what apiFetchWithStatus reads for error messages.
      if (req.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json(
          { detail: "Niet ingelogd.", code: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
      // Redirect to custom sign-in page
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect_url", req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
});


export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
