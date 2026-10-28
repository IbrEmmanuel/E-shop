import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a1a",
          color: "#f7f4ef",
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: "-0.06em",
          fontFamily: "Georgia, serif",
          borderRadius: 36,
        }}
      >
        E
      </div>
    ),
    { ...size },
  );
}
