import { serve } from "bun";
import index from "./index.html";

const LOCATIONS_URL = "https://bts.bcrs.sg/api/v1/locations";

const server = serve({
  routes: {
    "/api/locations": async (request) => {
      try {
        const upstream = await fetch(LOCATIONS_URL, {
          headers: { accept: "application/json" },
          signal: request.signal,
        });

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "cache-control": "public, max-age=300",
            "content-type":
              upstream.headers.get("content-type") ?? "application/json",
          },
        });
      } catch (error) {
        console.error("Failed to fetch BCRS locations", error);
        return Response.json(
          { status: "error", message: "Unable to fetch BCRS locations" },
          { status: 502 },
        );
      }
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`BCRS map running at ${server.url}`);
