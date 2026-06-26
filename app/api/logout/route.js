import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(request) {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", request.url));
}
