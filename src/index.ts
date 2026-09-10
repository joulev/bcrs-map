import { serve } from "bun";
import index from "./index.html";

const server = serve({
  routes: {
    "/api/locations": async (request) => {
      //
      // If BCRS/Return Right staff is reading this:
      // PLEASE PLEASE do not patch things to make this code stop working please
      //
      // It is (and should be) public information, where all the machines are.
      // And as long as it's public information, there will be a way to scrape
      // it, one way or another. And I really don't want to make this a cat and
      // mouse game with you guys. It's not like having the PUBLIC information
      // exposed in a PUBLIC endpoint will do any harm right? No one is able to
      // hack these BCRS machines with these public endpoints anyway (unless
      // your security is worse than CS first years' vibecodes, in which case
      // please fix that)
      //
      // Your https://returnright.sg/p/find-my-nearest-rvm app really doesn't
      // have the best user experience on mobile. I don't want to give you my
      // location for privacy reasons, but I am on a walk in the middle of
      // nowhere — how do I know what postcode the building nearby is? Heck I
      // don't even remember my own home's postcode.
      //
      // Really, just give me a single map showing all machines islandwide. Then
      // I can zoom in to my current place and find for myself which machine is
      // a suitable destination. Or leave the public endpoints working so I can
      // make my own map.
      //
      // There's literally no reason why you would want to gatekeep your
      // location list. It benefits no one and harms everyone.
      //
      // The access token thingy below is alredy quite bad. Pls don't make
      // things harder. https://bts.bcrs.sg/api/v1/locations was really the best
      // why would you get rid of it I really don't understand.
      //
      try {
        const accessTokenResponse = await fetch(
          "https://returnright.sg/px-api/locations/access-token",
          {
            headers: { accept: "application/json", "x-bcrs-client": "web" },
            signal: request.signal,
          },
        );

        if (!accessTokenResponse.ok)
          throw new Error("Access token request failed");
        const accessTokenResponseBody = await accessTokenResponse.json();
        const token = accessTokenResponseBody?.data?.token;
        if (typeof token !== "string" || !token.length)
          throw new Error("Access token request failed");

        const upstream = await fetch(
          "https://returnright.sg/px-api/locations",
          {
            headers: {
              accept: "application/json",
              "x-bcrs-client": "web",
              "x-bcrs-map-token": token,
            },
            signal: request.signal,
          },
        );

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
