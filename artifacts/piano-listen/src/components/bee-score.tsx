import { useEffect, useRef, useState } from 'react';
import { BEE_SONG_MEASURES, BEE_SONG_SCORE, type ScoredPianoNote } from '@/lib/piano-sequence';

type PositionedNote = ScoredPianoNote & { x: number; y: number; index: number };
type PositionedMeasure = { notes: PositionedNote[]; barX: number };

const FIRST_NOTE_X = 124;
const NOTE_Y: Record<number, number> = { 60: 90, 62: 85, 64: 80, 65: 75, 67: 70 };

function layoutScore(): { measures: PositionedMeasure[]; width: number } {
  let x = FIRST_NOTE_X;
  let index = 0;
  const measures = BEE_SONG_MEASURES.map((measure) => {
    const notes = measure.map((note) => {
      const positioned = { ...note, x, y: NOTE_Y[note.midi], index: index++ };
      x += note.duration === 'eighth' ? 36 : note.duration === 'quarter' ? 72 : 144;
      return positioned;
    });
    const barX = x + 7;
    x += 14;
    return { notes, barX };
  });
  return { measures, width: x + 16 };
}

const SCORE_LAYOUT = layoutScore();

export function BeeScore({ noteIndex }: { noteIndex: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef<Array<SVGEllipseElement | null>>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateWidth = () => setViewportWidth(viewport.clientWidth);
    updateWidth();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth);
      return () => window.removeEventListener('resize', updateWidth);
    }
    const observer = new ResizeObserver(updateWidth);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const note = noteRefs.current[Math.min(noteIndex, BEE_SONG_SCORE.length - 1)];
    if (!viewport || !note) return;
    const noteRect = note.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const left = Math.max(0, Math.min(
      viewport.scrollWidth - viewport.clientWidth,
      viewport.scrollLeft + noteRect.left + noteRect.width / 2 - viewportRect.left - viewport.clientWidth * 0.35,
    ));
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo({ left, behavior: noteIndex === 0 ? 'auto' : 'smooth' });
    } else {
      viewport.scrollLeft = left;
    }
  }, [noteIndex, viewportWidth]);

  return (
    <div className="bee-score-sheet" role="group" aria-label={`小蜜蜂樂譜，已彈 ${noteIndex} / ${BEE_SONG_SCORE.length} 個音`}>
      <div className="bee-score-viewport" ref={viewportRef} data-testid="bee-score-viewport" tabIndex={0}>
        <div className="bee-score-strip">
          <span aria-hidden="true" style={{ width: Math.max(0, viewportWidth * 0.35 - FIRST_NOTE_X), flexShrink: 0 }} />
          <svg
            className="bee-score-vector"
            width={SCORE_LAYOUT.width}
            height="125"
            viewBox={`0 0 ${SCORE_LAYOUT.width} 125`}
            aria-label="小蜜蜂完整五線譜"
            role="img"
          >
            {[40, 50, 60, 70, 80].map((y) => (
              <line key={y} x1="8" y1={y} x2={SCORE_LAYOUT.width - 10} y2={y} className="score-staff-line" />
            ))}
            <text x="17" y="70" className="score-clef">{'\uE050'}</text>
            <text x="70" y="58" className="score-time-signature">2</text>
            <text x="70" y="78" className="score-time-signature">4</text>
            {SCORE_LAYOUT.measures.map((measure, measureIndex) => {
              const eighths = measure.notes.filter((note) => note.duration === 'eighth');
              const first = eighths[0];
              const last = eighths[eighths.length - 1];
              const beamStart = first ? first.y - 34 : 0;
              const beamSlope = first && last ? Math.max(-8, Math.min(8, last.y - first.y)) : 0;
              const stemTop = (note: PositionedNote) => note.duration === 'eighth' && first && last && last.x !== first.x
                ? beamStart + beamSlope * (note.x - first.x) / (last.x - first.x)
                : note.y - 34;
              return (
                <g key={measureIndex}>
                  {measure.notes.map((note) => (
                    <g key={note.index}>
                      {note.midi === 60 && <line x1={note.x - 11} y1="90" x2={note.x + 11} y2="90" className="score-staff-line" />}
                      <line x1={note.x + 6} y1={note.y} x2={note.x + 6} y2={stemTop(note)} className="score-stem" />
                      <ellipse
                        ref={(element) => { noteRefs.current[note.index] = element; }}
                        cx={note.x}
                        cy={note.y}
                        rx="6.5"
                        ry="4.4"
                        transform={`rotate(-18 ${note.x} ${note.y})`}
                        className={`bee-score-note ${note.duration === 'half' ? 'is-half' : ''} ${note.index < noteIndex ? 'is-played' : ''} ${note.index === noteIndex ? 'is-current' : ''}`}
                        data-testid={`bee-score-note-${note.index}`}
                      />
                    </g>
                  ))}
                  {first && last && first !== last && (
                    <polygon
                      points={`${first.x + 5},${beamStart} ${last.x + 7},${beamStart + beamSlope} ${last.x + 7},${beamStart + beamSlope + 4} ${first.x + 5},${beamStart + 4}`}
                      className="score-beam"
                    />
                  )}
                  <line x1={measure.barX} y1="40" x2={measure.barX} y2="80" className="score-bar-line" />
                  {measureIndex === SCORE_LAYOUT.measures.length - 1 && (
                    <line x1={measure.barX + 5} y1="40" x2={measure.barX + 5} y2="80" className="score-final-bar" />
                  )}
                </g>
              );
            })}
          </svg>
          <span aria-hidden="true" style={{ width: viewportWidth * 0.65, flexShrink: 0 }} />
        </div>
      </div>
    </div>
  );
}
