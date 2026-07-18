import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  decideOwnerAccess,
  getSafePageReturnPath,
} from "@/lib/server/access-policy";
import { isOwnerUserId } from "@/lib/server/owner-config";

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;
  const publicDecision = decideOwnerAccess({
    pathname,
    userId: null,
    isOwner: false,
  });
  if (publicDecision.outcome === "allow") return;

  const { userId } = await auth();
  const decision = decideOwnerAccess({
    pathname,
    userId,
    isOwner: isOwnerUserId(userId),
  });

  if (decision.outcome === "allow") return;

  if (decision.outcome === "unauthenticated") {
    // API clients need a real JSON 401; following a page redirect would turn
    // the response into sign-in HTML with a misleading 200 status.
    if (decision.resource === "api") {
      return NextResponse.json(
        { detail: "Niet ingelogd.", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", getSafePageReturnPath(pathname));
    return NextResponse.redirect(signInUrl);
  }

  if (decision.resource === "api") {
    return NextResponse.json(
      { detail: "Geen toegang.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return NextResponse.redirect(new URL("/access-denied", req.url));
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/laventecare/documenten/(.*)",
    "/(api|trpc)(.*)",
  ],
};
