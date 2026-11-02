import './_group.css';

const mappings = [
  { finger: '拇指', note: 'Do', x: 78, tipX: 124, tipY: 180 },
  { finger: '食指', note: 'Re', x: 182, tipX: 190, tipY: 73 },
  { finger: '中指', note: 'Mi', x: 286, tipX: 244, tipY: 39 },
  { finger: '無名指', note: 'Fa', x: 390, tipX: 298, tipY: 56 },
  { finger: '小指', note: 'Sol', x: 494, tipX: 350, tipY: 88 },
];

export function Current() {
  return (
    <main className="lesson-shell min-h-screen">
      <div className="lesson-wrap">
        <section className="mx-auto flex w-full max-w-[860px] flex-1 flex-col justify-center py-8 sm:py-12" aria-labelledby="current-hand-title">
          <h1 id="current-hand-title" className="mb-7 text-center font-serif text-[clamp(30px,5vw,46px)] font-medium leading-tight tracking-[.12em] text-[hsl(var(--foreground))] sm:mb-9">
            右手五指
          </h1>
          <div className="relative overflow-hidden border-y border-[hsl(var(--foreground)/.13)] bg-[rgba(8,22,19,.28)] px-2 py-5 sm:px-6 sm:py-7">
            <div className="pointer-events-none absolute inset-x-[8%] top-1/2 h-px bg-gradient-to-r from-transparent via-[rgba(205,166,99,.16)] to-transparent" aria-hidden="true" />
            <svg className="relative mx-auto block h-auto w-full max-w-[660px]" viewBox="0 0 572 460" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="currentHandFill" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#d9c99f" stopOpacity=".96" />
                  <stop offset="1" stopColor="#a9ad88" stopOpacity=".9" />
                </linearGradient>
                <linearGradient id="currentPalmShade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f0dfb4" stopOpacity=".12" />
                  <stop offset="1" stopColor="#192d26" stopOpacity=".08" />
                </linearGradient>
              </defs>
              {mappings.map(({ finger, note, x, tipX, tipY }) => (
                <g key={finger}>
                  <path d={`M ${x} 70 C ${x} 96, ${tipX} ${tipY + 16}, ${tipX} ${tipY + 52}`} fill="none" stroke="rgba(217,185,121,.62)" strokeWidth="1.25" strokeDasharray="3 5" />
                  <rect x={x - 37} y="5" width="74" height="62" rx="2" fill="rgba(10,27,23,.82)" stroke="rgba(217,185,121,.32)" />
                  <text x={x} y="27" textAnchor="middle" fill="rgba(238,229,202,.73)" fontSize="11" fontFamily="var(--app-font-sans)">{finger}</text>
                  <text x={x} y="51" textAnchor="middle" fill="#e2bd78" fontSize="18" fontWeight="600" fontFamily="var(--app-font-serif)">{note}</text>
                </g>
              ))}
              <g transform="translate(0 52)">
                <path
                  d="M 180 328 C 160 318 147 297 143 273 L 119 215 C 113 200 119 186 131 182 C 143 178 153 187 161 202 L 171 220 L 171 104 C 171 85 180 73 194 73 C 209 73 217 85 217 104 L 217 190 L 217 70 C 217 51 226 39 242 39 C 258 39 267 52 267 71 L 267 190 L 267 87 C 267 69 277 56 293 56 C 309 56 319 69 319 88 L 319 198 L 319 119 C 319 101 330 88 346 88 C 362 88 372 101 372 120 L 372 233 C 372 291 348 328 307 343 L 213 343 C 199 343 188 338 180 328 Z"
                  fill="url(#currentHandFill)" stroke="rgba(239,224,186,.72)" strokeWidth="1.5" strokeLinejoin="round"
                />
                <path d="M 177 224 C 198 212 227 207 256 210 C 291 213 324 227 351 249 L 349 286 C 326 311 293 325 251 325 C 217 325 190 317 166 299 Z" fill="url(#currentPalmShade)" />
                <path d="M 179 260 C 210 273 267 275 325 254" fill="none" stroke="rgba(43,72,59,.25)" strokeWidth="1.3" />
                <path d="M 194 292 C 224 301 274 301 310 288" fill="none" stroke="rgba(43,72,59,.2)" strokeWidth="1.2" />
                <path d="M 171 215 C 159 229 152 243 151 259" fill="none" stroke="rgba(43,72,59,.23)" strokeWidth="1.2" />
                {mappings.map(({ finger, tipX, tipY }) => (
                  <g key={`tip-${finger}`}>
                    <circle cx={tipX} cy={tipY} r="10" fill="rgba(216,177,102,.2)" stroke="rgba(232,194,119,.92)" strokeWidth="1.5" />
                    <circle cx={tipX} cy={tipY} r="3.5" fill="#e2bd78" />
                  </g>
                ))}
                <text x="257" y="373" textAnchor="middle" fill="rgba(231,225,202,.6)" fontSize="10" letterSpacing="2.2" fontFamily="var(--app-font-sans)">右手 · 手掌朝前</text>
              </g>
            </svg>
          </div>
          <ol className="sr-only" aria-label="右手指法音符順序">
            {mappings.map(({ finger, note }) => <li key={finger}>{finger}：{note}</li>)}
          </ol>
        </section>
      </div>
    </main>
  );
}
