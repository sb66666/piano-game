type StaffChartProps = {
  clefGlyph: string;
  clefBaselineY: number;
  letters: readonly string[];
  solfege: readonly string[];
  markers: readonly { index: number; label: string }[];
  ariaLabel: string;
};

const STAFF_LINES = [180, 210, 240, 270, 300];
const STEP = 15;
const FIRST_NOTE_Y = 330;
const FIRST_NOTE_X = 210;
const NOTE_GAP = 59;

// The same ledger-line geometry works for both clefs: 13 ascending notes where the
// first note sits two steps below the bottom line and the last sits two steps above the top line.
export function StaffChart({ clefGlyph, clefBaselineY, letters, solfege, markers, ariaLabel }: StaffChartProps) {
  const notes = letters.map((letter, index) => ({
    letter,
    solfege: solfege[index],
    x: FIRST_NOTE_X + index * NOTE_GAP,
    y: FIRST_NOTE_Y - index * STEP,
    ledger: index === 0 || index === letters.length - 1,
  }));

  return (
    <div className="staff-reading-sheet">
      <svg viewBox="0 0 1000 460" role="img" aria-label={ariaLabel} data-testid="staff-reading-chart">
        {STAFF_LINES.map((y) => (
          <line key={y} x1="40" y1={y} x2="965" y2={y} className="staff-reading-line" />
        ))}
        <text x="58" y={clefBaselineY} className="staff-reading-clef" aria-hidden="true">{clefGlyph}</text>
        {markers.map(({ index, label }) => {
          const note = notes[index];
          return (
            <g key={index} className="staff-reading-marker">
              <line x1={note.x} y1={note.y - 16} x2={note.x} y2="112" />
              <polygon points={`${note.x},104 ${note.x - 5},116 ${note.x + 5},116`} />
              <text x={note.x} y="88" textAnchor="middle">{label}</text>
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
  );
}
