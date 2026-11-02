import { useLocation } from 'wouter';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'];
const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La'];
const STAFF_LINES = [180, 210, 240, 270, 300];
const STEP = 15;
const FIRST_NOTE_Y = 330;
const FIRST_NOTE_X = 210;
const NOTE_GAP = 59;

const notes = LETTERS.map((letter, index) => ({
  letter,
  solfege: SOLFEGE[index],
  x: FIRST_NOTE_X + index * NOTE_GAP,
  y: FIRST_NOTE_Y - index * STEP,
  ledger: index === 0 || index === 12,
}));

export default function StaffReadingScreen() {
  const [, setLocation] = useLocation();

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter staff-reading-content" aria-labelledby="staff-reading-title">
          <h1 id="staff-reading-title" className="staff-reading-title">高音譜號</h1>
          <div className="staff-reading-sheet">
            <svg viewBox="0 0 1000 460" role="img" aria-label="高音譜號上從中央 C 到高音 A 的音符位置" data-testid="staff-reading-chart">
              {STAFF_LINES.map((y) => (
                <line key={y} x1="40" y1={y} x2="965" y2={y} className="staff-reading-line" />
              ))}
              <text x="58" y="270" className="staff-reading-clef" aria-hidden="true">{'\uE050'}</text>
              {[0, 4].map((index) => {
                const note = notes[index];
                return (
                  <g key={index} className="staff-reading-marker">
                    <line x1={note.x} y1={note.y - 16} x2={note.x} y2="112" />
                    <polygon points={`${note.x},104 ${note.x - 5},116 ${note.x + 5},116`} />
                    <text x={note.x} y="88" textAnchor="middle">{index === 0 ? '中央 C' : '中央 G'}</text>
                  </g>
                );
              })}
              {notes.map((note, index) => (
                <g key={index} data-testid={`staff-note-${index}`}>
                  {note.ledger && (
                    <line x1={note.x - 24} y1={note.y} x2={note.x + 24} y2={note.y} className="staff-reading-ledger" />
                  )}
                  <ellipse cx={note.x} cy={note.y} rx="21" ry="14" transform={`rotate(-12 ${note.x} ${note.y})`} className="staff-reading-note" />
                  <ellipse cx={note.x} cy={note.y} rx="8" ry="11" transform={`rotate(-12 ${note.x} ${note.y})`} className="staff-reading-note-hole" />
                  <text x={note.x} y="395" textAnchor="middle" className="staff-reading-letter">{note.letter}</text>
                  <text x={note.x} y="424" textAnchor="middle" className="staff-reading-solfege">{note.solfege}</text>
                </g>
              ))}
            </svg>
          </div>
        </section>
        <footer className="flex justify-end pb-1 pt-4 sm:pb-2">
          <button
            type="button"
            className="min-h-12 min-w-24 rounded-full border border-[rgba(226,189,120,.68)] bg-[hsl(var(--primary))] px-7 font-medium tracking-[.08em] text-[hsl(var(--primary-foreground))] shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--primary))] active:translate-y-0"
            onClick={() => setLocation('/bee-intro')}
            data-testid="button-staff-understood"
          >
            了解
          </button>
        </footer>
      </div>
    </main>
  );
}
