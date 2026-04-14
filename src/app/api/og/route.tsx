/* eslint-disable @next/next/no-img-element */
// src/app/api/og/route.tsx
import { ImageResponse } from "next/og";
import { profileData } from "@/config/profile";
import { logger } from "@/lib/logger";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // 🚀 Dynamic parameters (Fallback to your config if no params are passed)
    const title = searchParams.get("title") || profileData.name;
    const subtitle = searchParams.get("subtitle") || profileData.bio;

    // 🚀 Gaming/Live parameters
    const isLive = searchParams.get("live") === "true";
    const game = searchParams.get("game");

    // Bulletproof URL resolution for the avatar image
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const safeAvatarPath = profileData.avatarUrl.replace(".webp", ".png");
    const avatarSrc = new URL(safeAvatarPath, appUrl).href;

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
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Cyan Glow (Top Left) */}
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
        {/* Purple Glow (Bottom Right) */}
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

        {/* Glass Container */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "40px",
            padding: "70px 100px",
            boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.6)",
          }}
        >
          <img
            src={avatarSrc}
            alt="Avatar"
            width={200}
            height={200}
            style={{
              borderRadius: "100px",
              border: "4px solid rgba(255, 255, 255, 0.8)",
              marginBottom: "40px",
              objectFit: "cover",
              boxShadow: "0 0 40px rgba(145,70,255,0.3)",
            }}
          />

          <h1
            style={{
              fontSize: "72px",
              fontWeight: "900",
              color: "#ffffff",
              margin: "0 0 16px 0",
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
              margin: "0 0 40px 0",
              fontWeight: "500",
              letterSpacing: "-0.01em",
              textAlign: "center",
              maxWidth: "800px",
            }}
          >
            {subtitle}
          </p>

          {/* 🚀 Dynamic Status Badge */}
          {isLive ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(239, 68, 68, 0.15)", // Red tint
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "16px 32px",
                borderRadius: "999px",
                color: "#fca5a5", // Red text
                fontSize: "28px",
                fontWeight: "900",
                letterSpacing: "0.05em",
              }}
            >
              <span style={{ marginRight: "12px" }}>🔴</span>
              {game ? `LIVE: ${game.toUpperCase()}` : "LIVE ON TWITCH"}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(145,70,255,0.15)", // Purple tint
                border: "1px solid rgba(145,70,255,0.3)",
                padding: "16px 32px",
                borderRadius: "999px",
                color: "#e9d5ff",
                fontSize: "28px",
                fontWeight: "700",
                letterSpacing: "-0.01em",
              }}
            >
              <span style={{ marginRight: "16px" }}>👾</span>
              {profileData.twitchTagline}
            </div>
          )}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            color: "#71717a",
            fontSize: "24px",
            fontWeight: "600",
            letterSpacing: "0.05em",
          }}
        >
          {appUrl.replace("https://", "").replace("http://", "")}
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
      },
    );
  } catch (error) {
    logger.error(error, {
      tags: { layer: "edge", component: "DynamicOGImage" },
    });

    return new ImageResponse(
      <div style={{ background: "#030303", width: "100%", height: "100%" }} />,
      { width: 1200, height: 630 },
    );
  }
}
