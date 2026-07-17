import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Page redirects remain a UX guard. Every privileged server resource also
// performs its own auth/owner check, so security never depends on path matching.
const PUBLIC_ROUTE_PREFIXES = ["/sign-in", "/sign-up"] as const;

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req.nextUrl.pathname)) {
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
