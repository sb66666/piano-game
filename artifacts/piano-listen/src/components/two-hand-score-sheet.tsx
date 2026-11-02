import { TWO_HAND_BEE_SCORE, type HandNote } from '@/lib/two-hand-score';

const SYSTEMS = 4;
const MEASURES_PER_SYSTEM = 4;
const GAP = 12;
const STAFF_HEIGHT = GAP * 4;
const SYSTEM_HEIGHT = 292;
const LEFT = 150;
const MEASURE_WIDTH = 205;
const BEAT_WIDTH = 42;
const NOTE_OFFSET = 26;
const WIDTH = LEFT + MEASURE_WIDTH * MEASURES_PER_SYSTEM + 24;

function noteY(staffTop: number, step: number) {
  return staffTop + STAFF_HEIGHT - (step - 2) * (GAP / 2);
}

function renderHand(notes: readonly HandNote[], measureX: number, staffTop: number, keyPrefix: string) {
  let beat = 0;
  return notes.map((note, index) => {
    const x = measureX + NOTE_OFFSET + beat * BEAT_WIDTH;
    const y = noteY(staffTop, note.step);
    beat += note.beats;
    const stemUp = note.step < 6;
    const hollow = note.beats > 1;
    return (
      <g key={`${keyPrefix}-${index}`}>
        {note.step <= 0 && <line x1={x - 10} y1={staffTop + STAFF_HEIGHT + GAP} x2={x + 10} y2={staffTop + STAFF_HEIGHT + GAP} className="score-staff-line" />}
        {note.beats < 4 && (
          <line
            x1={stemUp ? x + 5.6 : x - 5.6}
            y1={y + (stemUp ? -1 : 1)}
            x2={stemUp ? x + 5.6 : x - 5.6}
            y2={y + (stemUp ? -GAP * 3 : GAP * 3)}
            className="score-stem"
          />
        )}
        <ellipse
          cx={x}
          cy={y}
          rx={note.beats === 4 ? 7.5 : 6.2}
          ry={note.beats === 4 ? 4.8 : 4.4}
          transform={note.beats === 4 ? undefined : `rotate(-20 ${x} ${y})`}
          className={hollow ? 'two-hand-note is-hollow' : 'two-hand-note'}
        />
      </g>
    );
  });
}

function noteXs(notes: readonly HandNote[], measureX: number) {
  let beat = 0;
  return notes.map((note) => {
    const x = measureX + NOTE_OFFSET + beat * BEAT_WIDTH;
    beat += note.beats;
    return x;
  });
}

export function TwoHandScoreSheet() {
  return (
    <div className="two-hand-sheet">
      <svg viewBox={`0 0 ${WIDTH} ${SYSTEM_HEIGHT * SYSTEMS + 120}`} role="img" aria-label="小蜜蜂雙手分解和弦樂譜" data-testid="two-hand-score">
        <text x={WIDTH / 2} y="48" textAnchor="middle" className="two-hand-title">小蜜蜂</text>
        <text x={WIDTH / 2} y="80" textAnchor="middle" className="two-hand-subtitle">分解和弦</text>
        {Array.from({ length: SYSTEMS }, (_, system) => {
          const top = 140 + system * SYSTEM_HEIGHT;
          const lowerTop = top + STAFF_HEIGHT + 92;
          const bottom = lowerTop + STAFF_HEIGHT;
          return (
            <g key={system}>
              {system > 0 && <text x="82" y={top - 6} className="two-hand-measure-number">{system * MEASURES_PER_SYSTEM + 1}</text>}
              {[top, lowerTop].map((staffTop, staffIndex) => (
                <g key={staffIndex}>
                  {[0, 1, 2, 3, 4].map((line) => (
                    <line key={line} x1={LEFT - 20} y1={staffTop + line * GAP} x2={LEFT + MEASURE_WIDTH * MEASURES_PER_SYSTEM} y2={staffTop + line * GAP} className="score-staff-line" />
                  ))}
                  <text x="102" y={staffTop + STAFF_HEIGHT - GAP} className="two-hand-clef" aria-hidden="true">{'\uE050'}</text>
                  {system === 0 && <text x="132" y={staffTop + STAFF_HEIGHT / 2} className="two-hand-time" aria-hidden="true">{'\uE08A'}</text>}
                </g>
              ))}
              <line x1={LEFT - 20} y1={top} x2={LEFT - 20} y2={bottom} className="score-bar-line" />
              <path d={`M 94 ${top} C 78 ${top + 40}, 94 ${(top + bottom) / 2 - 30}, 76 ${(top + bottom) / 2} C 94 ${(top + bottom) / 2 + 30}, 78 ${bottom - 40}, 94 ${bottom}`} className="two-hand-brace" />
              {Array.from({ length: MEASURES_PER_SYSTEM }, (_, column) => {
                const measureIndex = system * MEASURES_PER_SYSTEM + column;
                const measure = TWO_HAND_BEE_SCORE[measureIndex];
                const measureX = LEFT + column * MEASURE_WIDTH + (system === 0 && column === 0 ? 12 : 0);
                const barX = LEFT + (column + 1) * MEASURE_WIDTH;
                const rightXs = noteXs(measure.right, measureX);
                return (
                  <g key={measureIndex}>
                    {measure.chord && <text x={measureX + 4} y={top - 38} className="two-hand-chord">{measure.chord}</text>}
                    {renderHand(measure.right, measureX, top, `r${measureIndex}`)}
                    {renderHand(measure.left, measureX, lowerTop, `l${measureIndex}`)}
                    {measure.right.map((note, index) => note.finger !== undefined && (
                      <text key={`rf${index}`} x={rightXs[index]} y={top - 14} textAnchor="middle" className="two-hand-finger">{note.finger}</text>
                    ))}
                    {noteXs(measure.left, measureX).map((x, index) => measure.left[index].finger !== undefined && (
                      <text key={`lf${index}`} x={x} y={bottom + 34} textAnchor="middle" className="two-hand-finger">{measure.left[index].finger}</text>
                    ))}
                    {[...measure.lyrics].map((char, index) => (
                      <text key={`ly${index}`} x={rightXs[index]} y={top + STAFF_HEIGHT + 50} textAnchor="middle" className="two-hand-lyric">{char}</text>
                    ))}
                    <line x1={barX} y1={top} x2={barX} y2={bottom} className="score-bar-line" />
                    {measureIndex === TWO_HAND_BEE_SCORE.length - 1 && (
                      <line x1={barX + 5} y1={top} x2={barX + 5} y2={bottom} className="score-final-bar" />
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
