import { NextResponse } from "next/server";

export const runtime = "nodejs";

const association = {
  applinks: {
    apps: [],
    details: [
      {
        appID: "4A46M5TYNP.com.aegeantracksociety.app",
        components: [
          {
            "/": "/auth/mobile-recovery",
          },
        ],
      },
    ],
  },
};

export function GET() {
  return NextResponse.json(association, {
    headers: {
      "Cache-Control": "public, max-age=3600, must-revalidate",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
