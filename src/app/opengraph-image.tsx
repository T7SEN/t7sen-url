/* eslint-disable @next/next/no-img-element */
// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";
import { profileData } from "@/config/profile";

export const alt = `${profileData.name} - ${profileData.bio}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const safeAvatarPath = profileData.avatarUrl.replace(".webp", ".png");
  const avatarSrc = new URL(safeAvatarPath, appUrl).href;

  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(to bottom right, #09090b, #18181b)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Subtle Twitch Purple Glow */}
      <div
        style={{
          position: "absolute",
          top: "-20%",
          left: "-10%",
          width: "80%",
          height: "80%",
          background:
            "radial-gradient(circle, rgba(145,70,255,0.15) 0%, rgba(0,0,0,0) 70%)",
        }}
      />

      {/* Central Glassmorphic Card Container */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "32px",
          padding: "60px 80px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Explicit width and height attributes added here! */}
        <img
          src={avatarSrc}
          alt="Avatar"
          width={180}
          height={180}
          style={{
            borderRadius: "90px",
            border: "4px solid white",
            marginBottom: "40px",
            objectFit: "cover",
          }}
        />

        {/* Name */}
        <h1
          style={{
            fontSize: "64px",
            fontWeight: "900",
            color: "white",
            margin: "0 0 20px 0",
            letterSpacing: "-2px",
          }}
        >
          {profileData.name}
        </h1>

        {/* Bio */}
        <p
          style={{
            fontSize: "32px",
            color: "#a1a1aa",
            margin: "0 0 10px 0",
            fontWeight: "500",
          }}
        >
          {profileData.bio}
        </p>

        {/* Tagline / Twitch Identifier */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: "20px",
            background: "rgba(145,70,255,0.2)",
            padding: "10px 24px",
            borderRadius: "999px",
            color: "#e9d5ff",
            fontSize: "24px",
            fontWeight: "bold",
          }}
        >
          <span style={{ marginRight: "12px" }}>🎮</span>
          {profileData.twitchTagline}
        </div>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
