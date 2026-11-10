import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const name = "linkspace_workspace";
  const existing = request.cookies.get(name)?.value;
  if (existing && /^[a-f0-9]{64}$/.test(existing)) return NextResponse.next();
  const token = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
  const requestHeaders = new Headers(request.headers);
  const previous = (requestHeaders.get("cookie") ?? "").split(";").map((part) => part.trim()).filter((part) => part && !part.startsWith(`${name}=`)).join("; ");
  requestHeaders.set("cookie", `${previous ? `${previous}; ` : ""}${name}=${token}`);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(name, token, { httpOnly: true, sameSite: "lax", secure: request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = { matcher: ["/"] };
