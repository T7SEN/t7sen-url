/* eslint-disable @next/next/no-img-element */
// src/app/api/og/route.tsx
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { NextResponse, after } from "next/server";
import { profileData } from "@/config/profile";
import { logger } from "@/lib/logger";
import { getStreamStatus, OFFLINE, type StreamStatus } from "@/lib/twitch";
import { flushSentry, flushSentryAfterResponse } from "@/lib/sentry-flush";

const SIZE = { width: 1200, height: 630 };

// Crawlers (X, Discord, Slack...) give up after a few seconds, so the image
// renders without the LIVE badge rather than waiting on a slow Twitch
const STATUS_BUDGET_MS = 2500;

// CDN-cache each render for 5 minutes; next/og's default is max-age=0, which
// re-rendered on every crawler hit. No stale-while-revalidate: it would hand
// a go-live share the previous (offline) render. Worst-case badge lag is
// s-maxage plus the 30 s status memo in src/lib/twitch.ts.
const CACHE_CONTROL = "public, max-age=0, s-maxage=300";
// Renders that fell back (badge dropped after a Twitch timeout/error,
// initials instead of the avatar, Geist instead of Space Grotesk)
const DEGRADED_CACHE_CONTROL = "public, max-age=0, s-maxage=60";

// Long Twitch categories stretched the card to the canvas edges
const MAX_GAME_LABEL = 36;

type OgFont = {
  name: string;
  data: Buffer;
  weight: 500 | 700;
  style: "normal";
};

// next/og only bundles Geist Regular, so the heavy weights rendered as 400.
// Static Space Grotesk TTFs (satori can't read woff2), read once per instance.
let fontsPromise: Promise<OgFont[] | undefined> | null = null;

function loadFonts(): Promise<OgFont[] | undefined> {
  fontsPromise ??= Promise.all([
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Medium.ttf")),
    readFile(join(process.cwd(), "assets/fonts/SpaceGrotesk-Bold.ttf")),
  ])
    .then(([medium, bold]): OgFont[] => [
      { name: "Space Grotesk", data: medium, weight: 500, style: "normal" },
      { name: "Space Grotesk", data: bold, weight: 700, style: "normal" },
    ])
    .catch((err: unknown) => {
      // Fall back to next/og's built-in Geist rather than failing the image
      logger.error(err, {
        tags: { component: "DynamicOGImage", issue: "font_load_failed" },
      });
      return undefined;
    });
  return fontsPromise;
}

type BudgetedStatus = { status: StreamStatus; degraded: boolean };

async function getStatusWithinBudget(): Promise<BudgetedStatus> {
  // Always resolves, so a late rejection can't become an unhandled one
  const status = getStreamStatus(profileData.twitchChannel).then(
    (value): BudgetedStatus => ({ status: value, degraded: false }),
    (err: unknown): BudgetedStatus => {
      logger.warn("OG image could not read Twitch status", {
        tags: { component: "DynamicOGImage" },
        extra: { error: err instanceof Error ? err.message : String(err) },
      });
      return { status: OFFLINE, degraded: true };
    },
  );

  // If the budget wins, keep the instance alive until the Twitch call settles
  // (it fills the token and status caches for the next render), then flush
  // any warning it logged after the route's own flush finished
  after(status.then(() => flushSentry()));

  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<BudgetedStatus>((resolve) => {
    timer = setTimeout(
      () => resolve({ status: OFFLINE, degraded: true }),
      STATUS_BUDGET_MS,
    );
  });

  try {
    return await Promise.race([status, budget]);
  } finally {
    clearTimeout(timer);
  }
}

// The PNG copy of profileData.avatarUrl (the OG renderer cannot decode WebP),
// read from disk like the fonts and inlined as a data URL, once per instance.
// It used to be fetched over HTTP from the request origin, which Vercel
// Deployment Protection refuses on preview URLs (initials instead). Literal
// path so Next traces the file into this function.
let avatarPromise: Promise<string | null> | null = null;

function loadAvatarDataUrl(): Promise<string | null> {
  avatarPromise ??= readFile(join(process.cwd(), "public/avatar.png"))
    .then((bytes) => `data:image/png;base64,${bytes.toString("base64")}`)
    .catch((err: unknown) => {
      logger.warn("OG image could not load the avatar", {
        tags: { component: "DynamicOGImage" },
        extra: { error: err instanceof Error ? err.message : String(err) },
      });
      return null;
    });
  return avatarPromise;
}

export async function GET(request: Request) {
  flushSentryAfterResponse();

  // og:image is the bare /api/og. The CDN keys on the full query string, so
  // ?v=1, ?v=2... would each be an uncached render (the costliest work on the
  // site) while the Vercel Firewall only limits per IP. Send any query to the
  // bare URL with a cheap, CDN-cacheable redirect. (Next strips its internal
  // nxtP*/nxtI* params before this, so those still render; the per-IP limit
  // caps them.)
  const url = new URL(request.url);
  if (url.search !== "") {
    return NextResponse.redirect(new URL(url.pathname, url), {
      status: 308,
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  }

  try {
    // Fixed text only: the route used to render ?title=&subtitle= from the URL,
    // so anyone could mint a branded image on this domain
    const title = profileData.name;
    const subtitle = profileData.ogSubtitle;

    // Reading the request keeps this handler dynamic (never prerendered)
    const origin = url.origin;
    const displayHost = new URL(process.env.NEXT_PUBLIC_APP_URL || origin).host;

    const [statusResult, avatarSrc, fonts] = await Promise.all([
      getStatusWithinBudget(),
      loadAvatarDataUrl(),
      loadFonts(),
    ]);
    const { isLive, game } = statusResult.status;
    // A fallback render is only cached briefly so it isn't pinned for long
    const degraded = statusResult.degraded || !avatarSrc || !fonts;

    const gameLabel =
      game && game.length > MAX_GAME_LABEL
        ? `${game.slice(0, MAX_GAME_LABEL - 1).trimEnd()}…`
        : game;

    return new ImageResponse(
      <div
        style={{
          background: "#030303",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fonts ? "Space Grotesk" : "sans-serif",
          position: "relative",
          overflow: "hidden",
          // Keeps the centred card clear of the domain line at the bottom
          paddingBottom: "56px",
        }}
      >
        {/* Cyan Glow */}
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "80%",
            height: "80%",
            background:
              "radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        {/* Purple Glow */}
        <div
          style={{
            position: "absolute",
            bottom: "-20%",
            right: "-10%",
            width: "80%",
            height: "80%",
            background:
              "radial-gradient(circle, rgba(145,70,255,0.2) 0%, rgba(0,0,0,0) 60%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "40px",
            padding: "48px 96px",
            boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6)",
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="Avatar"
              width={168}
              height={168}
              style={{
                borderRadius: "84px",
                border: "4px solid rgba(255, 255, 255, 0.8)",
                marginBottom: "32px",
                objectFit: "cover",
                boxShadow: "0 0 40px rgba(145,70,255,0.3)",
              }}
            />
          ) : (
            // Avatar unavailable: initials in the same circle
            <div
              style={{
                width: "168px",
                height: "168px",
                borderRadius: "84px",
                border: "4px solid rgba(255, 255, 255, 0.8)",
                marginBottom: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#27272a",
                color: "#a1a1aa",
                fontSize: "64px",
                fontWeight: 700,
              }}
            >
              {title.slice(0, 2).toUpperCase()}
            </div>
          )}

          <h1
            style={{
              fontSize: "72px",
              fontWeight: 700,
              color: "#ffffff",
              margin: "0 0 12px 0",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            {title}
          </h1>

          <p
            style={{
              fontSize: "32px",
              color: "#a1a1aa",
              margin: "0 0 32px 0",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              textAlign: "center",
              maxWidth: "800px",
            }}
          >
            {subtitle}
          </p>

          {/* Dynamic Status Badge. CSS dots instead of emoji: satori fetches
              emoji images from a CDN on every render */}
          {isLive ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "16px 32px",
                borderRadius: "999px",
                color: "#fca5a5",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  borderRadius: "999px",
                  background: "#ef4444",
                  boxShadow: "0 0 12px rgba(239,68,68,0.8)",
                  marginRight: "16px",
                }}
              />
              {gameLabel ? `LIVE: ${gameLabel.toUpperCase()}` : "LIVE ON TWITCH"}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(145,70,255,0.15)",
                border: "1px solid rgba(145,70,255,0.3)",
                padding: "16px 32px",
                borderRadius: "999px",
                color: "#e9d5ff",
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.01em",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "999px",
                  background: "#9146FF",
                  marginRight: "16px",
                }}
              />
              {profileData.twitchTagline}
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "32px",
            display: "flex",
            alignItems: "center",
            color: "#71717a",
            fontSize: "24px",
            fontWeight: 500,
            letterSpacing: "0.05em",
          }}
        >
          {displayHost}
        </div>
      </div>,
      {
        ...SIZE,
        fonts,
        headers: {
          "Cache-Control": degraded ? DEGRADED_CACHE_CONTROL : CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    logger.error(error, {
      tags: { component: "DynamicOGImage" },
    });

    return new ImageResponse(
      <div style={{ background: "#030303", width: "100%", height: "100%" }} />,
      // Short CDN cache so a transient failure isn't pinned for long
      { ...SIZE, headers: { "Cache-Control": DEGRADED_CACHE_CONTROL } },
    );
  }
}
