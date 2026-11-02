import { useLocation } from 'wouter';

const mappings = [
  { note: 'Do', finger: '拇指', x: 96 },
  { note: 'Re', finger: '食指', x: 210 },
  { note: 'Mi', finger: '中指', x: 324 },
  { note: 'Fa', finger: '無名指', x: 438 },
  { note: 'Sol', finger: '小指', x: 552 },
];

export default function HandPositionScreen() {
  const [, setLocation] = useLocation();

  return (
    <main className="lesson-shell min-h-[100dvh]">
      <div className="lesson-wrap">
        <section
          className="mx-auto flex w-full max-w-[900px] flex-1 flex-col justify-center py-6 sm:py-10"
          aria-labelledby="hand-position-title"
        >
          <h1 id="hand-position-title" className="mb-5 text-center font-serif text-[clamp(28px,5vw,44px)] font-medium leading-tight tracking-[.1em] text-[hsl(var(--foreground))] sm:mb-7">
            右手五指
          </h1>

          <div className="relative w-full overflow-hidden rounded-[1.75rem] border border-[rgba(226,189,120,.16)] bg-[rgba(8,22,19,.32)] px-2 py-3 sm:px-7 sm:py-6">
            <svg
              className="mx-auto block h-auto w-full max-w-[660px]"
              viewBox="0 0 648 470"
              role="img"
              aria-labelledby="hand-illustration-title hand-illustration-desc"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title id="hand-illustration-title">右手放在 Do 到 Sol 五個琴鍵上</title>
              <desc id="hand-illustration-desc">
                平面插畫顯示右手五指與白鍵對應：拇指 Do、食指 Re、中指 Mi、無名指 Fa、小指 Sol。
              </desc>
              <defs>
                <linearGradient id="flat-palm" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#d7d5aa" />
                  <stop offset="1" stopColor="#a9b99a" />
                </linearGradient>
                <linearGradient id="flat-key" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f0ead5" />
                  <stop offset="1" stopColor="#d4d5c0" />
                </linearGradient>
              </defs>

              {mappings.map(({ finger, note, x }) => (
                <g key={`mapping-${note}`}>
                  <text x={x} y="40" textAnchor="middle" fill="rgba(238,229,202,.78)" fontSize="11" fontFamily="var(--app-font-sans)">
                    {finger}
                  </text>
                  <text x={x} y="61" textAnchor="middle" fill="#e2bd78" fontSize="14" fontWeight="600" fontFamily="var(--app-font-serif)">
                    {note}
                  </text>
                </g>
              ))}

              <g aria-hidden="true">
                {mappings.map(({ note, x }) => (
                  <g key={`guide-${note}`}>
                    <path d={`M ${x} 306 C ${x} 324, ${x} 333, ${x} 350`} fill="none" stroke="rgba(226,189,120,.68)" strokeWidth="1.5" strokeDasharray="3 6" />
                    <circle cx={x} cy="306" r="5" fill="#e2bd78" />
                  </g>
                ))}
              </g>

              <g stroke="rgba(239,229,197,.78)" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
                <path d="M180 180 L240 180 L240 265 C240 283 228 295 210 295 C192 295 180 283 180 265 Z" fill="url(#flat-palm)" />
                <path d="M294 164 L354 164 L354 276 C354 294 342 306 324 306 C306 306 294 294 294 276 Z" fill="url(#flat-palm)" />
                <path d="M408 181 L468 181 L468 286 C468 304 456 316 438 316 C420 316 408 304 408 286 Z" fill="url(#flat-palm)" />
                <path d="M522 204 L582 204 L582 300 C582 318 570 330 552 330 C534 330 522 318 522 300 Z" fill="url(#flat-palm)" />
                <path d="M155 212 C142 199 142 180 156 166 L213 117 C236 98 258 97 281 99 L478 101 C513 102 539 123 550 155 L578 216 C587 235 579 253 562 260 C546 267 530 258 521 243 L501 213 C490 198 474 195 460 200 L435 211 C410 196 381 187 348 187 C313 187 281 196 254 214 C232 204 211 202 190 210 L162 239 C149 252 130 250 120 237 C109 224 114 208 128 198 Z" fill="url(#flat-palm)" />
                <path d="M95 311 C82 303 81 287 91 274 L139 219 C152 203 174 204 187 216 C199 228 196 247 183 261 L137 304 C125 316 108 320 95 311 Z" fill="url(#flat-palm)" />
                <path d="M185 207 C236 178 303 165 365 171 C421 176 466 190 498 216" fill="none" stroke="rgba(59,86,68,.28)" />
                <path d="M178 245 C242 264 315 269 390 253" fill="none" stroke="rgba(59,86,68,.22)" />
                <path d="M210 205 C214 225 214 246 210 266 M324 202 C328 228 328 250 324 276 M438 207 C442 232 442 258 438 285 M552 219 C556 244 556 270 552 300" fill="none" stroke="rgba(59,86,68,.18)" strokeWidth="1.5" />
              </g>

              <g aria-hidden="true">
                <rect x="42" y="346" width="564" height="89" rx="9" fill="#071311" stroke="rgba(226,189,120,.38)" strokeWidth="2" />
                {mappings.map(({ note, x }, index) => (
                  <g key={`key-${note}`}>
                    <rect x={x - 53} y="349" width="106" height="82" rx="5" fill="url(#flat-key)" stroke="rgba(29,52,43,.42)" strokeWidth="1.5" />
                    <text x={x} y="414" textAnchor="middle" fill="#29483b" fontSize="17" fontWeight="600" fontFamily="var(--app-font-serif)">
                      {note}
                    </text>
                    {index === 0 || index === 1 || index === 3 ? (
                      <rect x={x + 42} y="349" width="22" height="48" rx="3" fill="#152521" />
                    ) : null}
                  </g>
                ))}
              </g>

              <text x="324" y="458" textAnchor="middle" fill="rgba(231,225,202,.55)" fontSize="12" letterSpacing="1.4" fontFamily="var(--app-font-sans)">
                右手 · 手掌朝前
              </text>
            </svg>
          </div>

          <ol className="sr-only" aria-label="右手指法音符順序">
            {mappings.map(({ finger, note }) => <li key={finger} data-testid={`mapping-${note.toLowerCase()}`}>{finger}：{note}</li>)}
          </ol>
        </section>
        <footer className="flex justify-end pb-1 pt-4 sm:pb-2">
          <button
            type="button"
            className="min-h-12 min-w-24 rounded-full border border-[rgba(226,189,120,.68)] bg-[hsl(var(--primary))] px-7 font-medium tracking-[.08em] text-[hsl(var(--primary-foreground))] shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--primary))] active:translate-y-0"
            onClick={() => setLocation('/')}
            aria-label="了解手指位置並返回首頁"
            data-testid="button-understood"
          >
            了解
          </button>
        </footer>
      </div>
    </main>
  );
}
