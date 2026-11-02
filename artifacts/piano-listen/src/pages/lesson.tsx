import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { makeReading, midiFromReading, pitchFromBuffer, type Reading } from '@/lib/pitch';
import {
  CENTRAL_DO_SEQUENCE,
  FIVE_NOTE_SEQUENCE,
  matchesSequenceNote,
  REQUIRED_STABLE_FRAMES,
  SEQUENCE_MINIMUM_RMS,
  SEQUENCE_STABLE_FRAMES_REQUIRED,
} from '@/lib/piano-sequence';

type LessonPhase = 'idle' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'unsupported' | 'error' | 'complete';
type LessonMode = 'central-do' | 'five-note-sequence';

const KEY_NAMES = ['Do', '升 Do', 'Re', '升 Re', 'Mi', 'Fa', '升 Fa', 'Sol', '升 Sol', 'La', '升 La', 'Si'];
const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_MIDI = Array.from({ length: 24 }, (_, index) => 48 + index).filter((midi) => WHITE_PITCHES.has(midi % 12));
const BLACK_MIDI = Array.from({ length: 24 }, (_, index) => 48 + index).filter((midi) => !WHITE_PITCHES.has(midi % 12));

export default function LessonScreen() {
  return <PitchLesson mode="central-do" />;
}

export function FiveNotePracticeScreen() {
  return <PitchLesson mode="five-note-sequence" />;
}

function PitchLesson({ mode }: { mode: LessonMode }) {
  const [, setLocation] = useLocation();
  const lessonSequence = mode === 'five-note-sequence' ? FIVE_NOTE_SEQUENCE : CENTRAL_DO_SEQUENCE;
  const [phase, setPhase] = useState<LessonPhase>('idle');
  const [reading, setReading] = useState<Reading | null>(null);
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const stableTargetFramesRef = useRef(0);
  const sequenceIndexRef = useRef(0);

  const releaseAudio = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') {
      try { await context.close(); } catch { /* Context may already be closing. */ }
    }
  }, []);

  useEffect(() => () => {
    generationRef.current += 1;
    void releaseAudio();
  }, [releaseAudio]);

  const stopListening = useCallback(async (nextPhase: LessonPhase = 'idle') => {
    generationRef.current += 1;
    await releaseAudio();
    setPhase(nextPhase);
  }, [releaseAudio]);

  const startListening = useCallback(async (force = false) => {
    if (!force && (phase === 'requesting' || phase === 'listening' || phase === 'complete')) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === 'undefined') {
      setPhase('unsupported');
      return;
    }
    const generation = ++generationRef.current;
    stableTargetFramesRef.current = 0;
    setReading(null);
    setPhase('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        video: false,
      });
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const context = new AudioContext();
      contextRef.current = context;
      await context.resume();
      if (generation !== generationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        await context.close();
        return;
      }
      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);
      sourceRef.current = source;
      analyserRef.current = analyser;
      const buffer = new Float32Array(analyser.fftSize);
      setPhase('listening');

      timerRef.current = window.setInterval(() => {
        if (generation !== generationRef.current) return;
        analyser.getFloatTimeDomainData(buffer);
        const frame = pitchFromBuffer(
          buffer,
          context.sampleRate,
          mode === 'five-note-sequence' ? SEQUENCE_MINIMUM_RMS : undefined,
        );
        if (!frame) {
          stableTargetFramesRef.current = 0;
          return;
        }
        const nextReading = makeReading(frame.frequency);
        setReading(nextReading);
        const target = lessonSequence[sequenceIndexRef.current];
        const isStableTarget = target !== undefined
          && matchesSequenceNote(
            midiFromReading(nextReading),
            nextReading.cents,
            frame.clarity,
            target.midi,
            frame.rms,
          );
        stableTargetFramesRef.current = isStableTarget ? stableTargetFramesRef.current + 1 : 0;
        const requiredStableFrames = mode === 'five-note-sequence'
          ? SEQUENCE_STABLE_FRAMES_REQUIRED
          : REQUIRED_STABLE_FRAMES;
        if (stableTargetFramesRef.current >= requiredStableFrames) {
          stableTargetFramesRef.current = 0;
          const nextIndex = sequenceIndexRef.current + 1;
          sequenceIndexRef.current = nextIndex;
          setSequenceIndex(nextIndex);
          if (nextIndex >= lessonSequence.length) {
            generationRef.current += 1;
            setPhase('complete');
            void releaseAudio();
          }
        }
      }, 100);

      stream.getAudioTracks().forEach((track) => {
        track.addEventListener('ended', () => {
          if (generation === generationRef.current) void stopListening('error');
        }, { once: true });
      });
    } catch (error) {
      if (generation !== generationRef.current) return;
      await releaseAudio();
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setPhase('denied');
      else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'NotReadableError') setPhase('unavailable');
      else setPhase('error');
    }
  }, [lessonSequence, mode, phase, releaseAudio, stopListening]);

  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void startListeningRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase !== 'complete' || mode !== 'central-do') return;
    const timer = window.setTimeout(() => setLocation('/hand-position'), 900);
    return () => window.clearTimeout(timer);
  }, [mode, phase, setLocation]);

  const detectedMidi = reading ? midiFromReading(reading) : null;
  const targetNote = lessonSequence[Math.min(sequenceIndex, lessonSequence.length - 1)];
  const targetMidi = targetNote.midi;
  const isSequenceLesson = mode === 'five-note-sequence';
  const isError = ['denied', 'unavailable', 'unsupported', 'error'].includes(phase);
  const errorMessage = phase === 'denied'
    ? '請允許麥克風。'
    : phase === 'unavailable'
      ? '找不到麥克風。'
      : phase === 'unsupported'
        ? '瀏覽器無法使用麥克風。'
        : phase === 'error'
          ? '麥克風連線中斷。'
          : null;
  const skipToHandPosition = async () => {
    await stopListening('idle');
    setLocation('/hand-position');
  };
  const restartSequence = async () => {
    await stopListening('idle');
    stableTargetFramesRef.current = 0;
    sequenceIndexRef.current = 0;
    setSequenceIndex(0);
    setReading(null);
    void startListeningRef.current(true);
  };

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        {!isSequenceLesson && (
          <button
            type="button"
            className="lesson-skip"
            onClick={() => void skipToHandPosition()}
            aria-label="跳過中央 Do 練習，前往手指位置"
            data-testid="button-skip-lesson"
          >
            跳過
          </button>
        )}
        <section className={`lesson-content page-enter ${isSequenceLesson ? 'is-sequence-lesson' : ''}`} aria-labelledby="lesson-instruction">
          <div className={`lesson-dialogue ${isError ? 'is-retryable' : ''}`}>
            <h1
              id="lesson-instruction"
              className="lesson-prompt"
              role={isError ? 'button' : undefined}
              tabIndex={isError ? 0 : undefined}
              onClick={isError ? () => void startListening() : undefined}
              onKeyDown={isError ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  void startListening();
                }
              } : undefined}
            >
              {phase === 'complete'
                ? (isSequenceLesson ? '完成！' : '成功')
                : (isSequenceLesson ? `彈下 ${targetNote.name} 吧！` : '彈下中央 Do 吧！')}
            </h1>
          </div>

          {isSequenceLesson && (
            <div className="lesson-sequence-progress" aria-label="Do Re Mi Fa Sol 練習進度">
              <ol className="lesson-sequence-notes">
                {lessonSequence.map((note, index) => (
                  <li
                    key={note.midi}
                    className={[
                      'lesson-sequence-note',
                      index < sequenceIndex ? 'is-complete' : '',
                      index === sequenceIndex && phase !== 'complete' ? 'is-current' : '',
                    ].filter(Boolean).join(' ')}
                    aria-current={index === sequenceIndex && phase !== 'complete' ? 'step' : undefined}
                    data-testid={`sequence-note-${note.name.toLowerCase()}`}
                  >
                    <span>{note.name}</span>
                    <small>{note.finger}</small>
                  </li>
                ))}
              </ol>
              <p className="lesson-sequence-status" role="status" aria-live="polite" data-testid="status-sequence-progress">
                {phase === 'complete' ? 'Do 到 Sol 都彈到了' : `已完成 ${sequenceIndex} / ${lessonSequence.length} 個音`}
              </p>
            </div>
          )}

          <section className="lesson-keyboard-card" aria-label="鋼琴鍵盤">
            <div className="lesson-keyboard" role="group" aria-label="兩個八度的鋼琴琴鍵，偵測到的音符會亮起">
              <div className="white-keys">
                {WHITE_MIDI.map((midi) => {
                  const noteIndex = midi % 12;
                  const octave = Math.floor(midi / 12) - 1;
                  const highlighted = detectedMidi === midi || (phase === 'complete' && midi === targetMidi);
                  return (
                    <div key={midi} className={`lesson-white-key ${highlighted ? 'key-active' : ''} ${midi === targetMidi ? 'key-target' : ''}`} aria-label={`${KEY_NAMES[noteIndex]}${octave}${highlighted ? '，目前偵測到' : ''}`} data-testid={`key-note-${midi}`}>
                      {highlighted && <span className="key-glint" aria-hidden="true" />}
                      <span className="white-key-label">{KEY_NAMES[noteIndex]}<small>{octave}</small></span>
                      {midi === targetMidi && <span className="target-marker">{isSequenceLesson ? '目標' : '中央 Do'}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="black-keys" aria-hidden="true">
                {BLACK_MIDI.map((midi) => {
                  const precedingWhites = WHITE_MIDI.filter((whiteMidi) => whiteMidi < midi).length;
                  const highlighted = detectedMidi === midi;
                  return <span key={midi} className={`lesson-black-key ${highlighted ? 'key-active' : ''}`} style={{ left: `${(precedingWhites / WHITE_MIDI.length) * 100}%` }} />;
                })}
              </div>
            </div>
          </section>
          {errorMessage && (
            <p className="lesson-error" role="status" aria-live="polite">{errorMessage}</p>
          )}
          {isSequenceLesson && phase === 'complete' && (
            <div className="lesson-practice-actions">
              <button type="button" className="lesson-restart" onClick={() => void restartSequence()} data-testid="button-restart-sequence">
                再練一次
              </button>
              <button type="button" className="lesson-home" onClick={() => setLocation('/bee-intro')} data-testid="button-next-bee-intro">
                下一頁
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
