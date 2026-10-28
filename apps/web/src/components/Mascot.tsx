import { useState } from "react";

export type MascotPose = "wave" | "invite" | "thinking" | "reading" | "celebrate" | "sleepy" | "peek" | "point";

/**
 * The Tanong402 mascot, one pose per place. Art lives in /public/mascot (SVG first, WebP if
 * present). Renders nothing if the file is missing, so pages never show a broken image.
 */
export function Mascot({
  pose,
  size = 96,
  className = "",
  alt = "",
}: {
  pose: MascotPose;
  size?: number;
  className?: string;
  alt?: string;
}) {
  const sources = [`/mascot/${pose}.webp`, `/mascot/${pose}.svg`, `/mascot/${pose}.png`];
  const [i, setI] = useState(0);
  if (i >= sources.length) return null;
  return (
    <img
      src={sources[i]}
      width={size}
      height={size}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      onError={() => setI((n) => n + 1)}
      className={`pointer-events-none select-none drop-shadow-[0_18px_30px_rgba(0,0,0,0.45)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
