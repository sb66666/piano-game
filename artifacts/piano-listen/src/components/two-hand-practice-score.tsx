import { useEffect, useRef, useState } from 'react';
import { TWO_HAND_BEE_SCORE, TWO_HAND_STEPS, type HandNote } from '@/lib/two-hand-score';

const FIRST_NOTE_X = 112;
const BEAT_WIDTH = 54;
const MEASURE_PAD = 26;
const MEASURE_WIDTH = BEAT_WIDTH * 4 + 24;
const STEP_Y = 5;
const TREBLE_BOTTOM = 84;
const BASS_BOTTOM = 196;
const TREBLE_TOP = TREBLE_BOTTOM - 40;
const BASS_TOP = BASS_BOTTOM - 40;
const HEIGHT = 238;

type Placed = { note: HandNote; x: number; y: number; step: number; hand: 'right' | 'left'; stemUp: boolean };

const noteY = (hand: 'right' | 'left', dn: number) =>
  hand === 'right' ? TREBLE_BOTTOM - (dn - 30) * STEP_Y : BASS_BOTTOM - (dn - 18) * STEP_Y;

const stepIndexByBeat = new Map(TWO_HAND_STEPS.map((step, index) => [`${step.measure}:${step.beat}`, index]));

function layout() {
  const placed: Placed[] = [];
  const measures = TWO_HAND_BEE_SCORE.map((measure, measureIndex) => {
    const start = FIRST_NOTE_X + measureIndex * MEASURE_WIDTH;
    (['right', 'left'] as const).forEach((hand) => {
      let beat = 0;
      measure[hand].forEach((note) => {
        placed.push({
          note,
          hand,
          x: start + MEASURE_PAD + beat * BEAT_WIDTH,
          y: noteY(hand, note.dn),
          step: stepIndexByBeat.get(`${measureIndex}:${beat}`) ?? 0,
          stemUp: note.dn < (hand === 'right' ? 34 : 22),
        });
        beat += note.beats;
      });
    });
    return { start, barX: start + MEASURE_WIDTH - 8, measure };
  });
  return { placed, measures, width: FIRST_NOTE_X + TWO_HAND_BEE_SCORE.length * MEASURE_WIDTH + 24 };
}

const LAYOUT = layout();

function beatOffset(notes: readonly HandNote[], index: number) {
  return notes.slice(0, index).reduce((sum, note) => sum + note.beats, 0);
}

export function TwoHandPracticeScore({ stepIndex }: { stepIndex: number }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<Array<SVGEllipseElement | null>>([]);
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setViewportWidth(viewport.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const marker = markerRefs.current[Math.min(stepIndex, TWO_HAND_STEPS.length - 1)];
    if (!viewport || !marker) return;
    const noteRect = marker.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const left = Math.max(0, Math.min(
      viewport.scrollWidth - viewport.clientWidth,
      viewport.scrollLeft + noteRect.left + noteRect.width / 2 - viewportRect.left - viewport.clientWidth * 0.35,
    ));
    if (typeof viewport.scrollTo === 'function') viewport.scrollTo({ left, behavior: stepIndex === 0 ? 'auto' : 'smooth' });
    else viewport.scrollLeft = left;
  }, [stepIndex, viewportWidth]);

  return (
    <div className="bee-score-sheet" role="group" aria-label={`小蜜蜂雙手樂譜，已彈 ${stepIndex} / ${TWO_HAND_STEPS.length} 步`}>
      <div className="bee-score-viewport" ref={viewportRef} data-testid="two-hand-viewport" tabIndex={0}>
        <div className="bee-score-strip">
          <span aria-hidden="true" style={{ width: Math.max(0, viewportWidth * 0.35 - FIRST_NOTE_X), flexShrink: 0 }} />
          <svg className="bee-score-vector" width={LAYOUT.width} height={HEIGHT} viewBox={`0 0 ${LAYOUT.width} ${HEIGHT}`} role="img" aria-label="小蜜蜂雙手完整樂譜">
            {[TREBLE_TOP, BASS_TOP].map((top) => (
              [0, 10, 20, 30, 40].map((offset) => (
                <line key={`${top}-${offset}`} x1="8" y1={top + offset} x2={LAYOUT.width - 10} y2={top + offset} className="score-staff-line" />
              ))
            ))}
            <line x1="8" y1={TREBLE_TOP} x2="8" y2={BASS_BOTTOM} className="score-bar-line" />
            <text x="18" y={TREBLE_BOTTOM - 10} className="score-clef">{'\uE050'}</text>
            <text x="18" y={BASS_TOP + 10} className="score-clef">{'\uE062'}</text>
            <text x="68" y={TREBLE_TOP + 20} className="score-clef">{'\uE08A'}</text>
            <text x="68" y={BASS_TOP + 20} className="score-clef">{'\uE08A'}</text>
            {LAYOUT.measures.map(({ start, barX, measure }, measureIndex) => (
              <g key={measureIndex}>
                {measure.chord && <text x={start + MEASURE_PAD - 6} y="22" className="two-hand-chord">{measure.chord}</text>}
                {[...measure.lyrics].map((char, index) => (
                  <text key={index} x={start + MEASURE_PAD + beatOffset(measure.right, index) * BEAT_WIDTH} y="138" textAnchor="middle" className="two-hand-lyric">{char}</text>
                ))}
                <line x1={barX} y1={TREBLE_TOP} x2={barX} y2={BASS_BOTTOM} className="score-bar-line" />
                {measureIndex === LAYOUT.measures.length - 1 && (
                  <line x1={barX + 5} y1={TREBLE_TOP} x2={barX + 5} y2={BASS_BOTTOM} className="score-final-bar" />
                )}
              </g>
            ))}
            {LAYOUT.placed.map(({ note, x, y, step, hand, stemUp }, index) => {
              const whole = note.beats === 4;
              const state = step < stepIndex ? 'is-played' : step === stepIndex ? 'is-current' : '';
              return (
                <g key={index}>
                  {hand === 'right' && note.dn <= 28 && (
                    <line x1={x - 11} y1={TREBLE_BOTTOM + 10} x2={x + 11} y2={TREBLE_BOTTOM + 10} className="score-staff-line" />
                  )}
                  {!whole && (
                    <line x1={stemUp ? x + 6 : x - 6} y1={y} x2={stemUp ? x + 6 : x - 6} y2={y + (stemUp ? -32 : 32)} className="score-stem" />
                  )}
                  <ellipse
                    ref={(element) => {
                      const stepRef = TWO_HAND_STEPS[step];
                      if (element && stepRef && ((hand === 'right' && stepRef.right) || (hand === 'left' && !stepRef.right))) {
                        markerRefs.current[step] = element;
                      }
                    }}
                    cx={x}
                    cy={y}
                    rx={whole ? 8 : 6.5}
                    ry={whole ? 5 : 4.4}
                    transform={whole ? undefined : `rotate(-18 ${x} ${y})`}
                    className={`bee-score-note ${note.beats > 1 ? 'is-half' : ''} ${state}`}
                    data-testid={`two-hand-note-${hand}-${step}`}
                  />
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
