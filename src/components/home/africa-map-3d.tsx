/**
 * Full-bleed 3D Africa backdrop for the landing hero.
 * Layered SVG extrusion + ambient depth rings (CSS only).
 */
export function AfricaMap3D({ className = "" }: { className?: string }) {
  return (
    <div className={`africa-map-3d ${className}`.trim()} aria-hidden>
      <div className="africa-map-3d__aura africa-map-3d__aura--a" />
      <div className="africa-map-3d__aura africa-map-3d__aura--b" />
      <div className="africa-map-3d__aura africa-map-3d__aura--c" />
      <div className="africa-map-3d__stage">
        <div className="africa-map-3d__shadow" />
        <div className="africa-map-3d__orbit">
          <div className="africa-map-3d__tilt">
            {[5, 4, 3, 2, 1].map((depth) => (
              <svg
                key={depth}
                className={`africa-map-3d__plate africa-map-3d__plate--${depth}`}
                viewBox="0 0 320 380"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d={AFRICA_MAIN} />
                <path d={MADAGASCAR} />
              </svg>
            ))}
            <svg
              className="africa-map-3d__face"
              viewBox="0 0 320 380"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="africaFaceGrad"
                  x1="50"
                  y1="20"
                  x2="250"
                  y2="340"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#ffe0bc" />
                  <stop offset="22%" stopColor="#ffb05c" />
                  <stop offset="55%" stopColor="#ff7600" />
                  <stop offset="100%" stopColor="#8f3600" />
                </linearGradient>
                <linearGradient
                  id="africaSheen"
                  x1="40"
                  y1="0"
                  x2="280"
                  y2="360"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                  <stop offset="35%" stopColor="#ffffff" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="africaSweep"
                  x1="0"
                  y1="0"
                  x2="320"
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                  <stop offset="45%" stopColor="#fff" stopOpacity="0.22" />
                  <stop offset="55%" stopColor="#fff" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <clipPath id="africaClip">
                  <path d={AFRICA_MAIN} />
                  <path d={MADAGASCAR} />
                </clipPath>
              </defs>
              <path
                d={AFRICA_MAIN}
                fill="url(#africaFaceGrad)"
                stroke="rgba(255,230,200,0.5)"
                strokeWidth="1.1"
                strokeLinejoin="round"
              />
              <path
                d={MADAGASCAR}
                fill="url(#africaFaceGrad)"
                stroke="rgba(255,230,200,0.5)"
                strokeWidth="0.9"
                strokeLinejoin="round"
              />
              <path d={AFRICA_MAIN} fill="url(#africaSheen)" />
              <path d={MADAGASCAR} fill="url(#africaSheen)" />
              <g clipPath="url(#africaClip)">
                <rect
                  className="africa-map-3d__sweep"
                  x="-80"
                  y="0"
                  width="120"
                  height="380"
                  fill="url(#africaSweep)"
                />
              </g>
              <ellipse
                className="africa-map-3d__glint"
                cx="145"
                cy="130"
                rx="40"
                ry="68"
                fill="#fff"
                opacity="0.1"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

const AFRICA_MAIN = [
  "M92 42",
  "L118 28",
  "L148 24",
  "L178 30",
  "L198 44",
  "L208 62",
  "L206 82",
  "L214 98",
  "L232 112",
  "L258 122",
  "L278 138",
  "L274 158",
  "L258 172",
  "L248 190",
  "L252 210",
  "L244 232",
  "L228 254",
  "L210 276",
  "L190 298",
  "L168 318",
  "L148 332",
  "L128 340",
  "L108 334",
  "L96 316",
  "L90 292",
  "L78 268",
  "L58 248",
  "L42 228",
  "L30 204",
  "L24 178",
  "L28 154",
  "L18 134",
  "L22 112",
  "L36 92",
  "L52 74",
  "L70 58",
  "L92 42",
  "Z",
].join(" ");

const MADAGASCAR = [
  "M276 196",
  "L288 206",
  "L292 224",
  "L288 246",
  "L278 266",
  "L268 282",
  "L258 292",
  "L250 284",
  "L252 264",
  "L258 242",
  "L264 220",
  "L270 204",
  "L276 196",
  "Z",
].join(" ");
