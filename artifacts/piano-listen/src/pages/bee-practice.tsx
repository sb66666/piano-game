import { useCallback, useEffect, useRef, useState } from 'react';
import beeScoreImage from '@assets/0_Screenshot_2026-11-02_2.45.40_PM_1793602029495.png';
import { makeReading, midiFromReading, pitchFromBuffer, type Reading } from '@/lib/pitch';
import {
  BEE_SONG_SCORE,
  matchesSequenceNote,
  SEQUENCE_MINIMUM_RMS,
  SEQUENCE_STABLE_FRAMES_REQUIRED,
} from '@/lib/piano-sequence';

type ListenPhase = 'idle' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'unsupported' | 'error' | 'complete';
type RepeatGate = { stage: 'release' | 'attack'; midi: number; rms: number; releaseRms: number };

const KEY_NAMES = ['Do', '升 Do', 'Re', '升 Re', 'Mi', 'Fa', '升 Fa', 'Sol', '升 Sol', 'La', '升 La', 'Si'];
const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_MIDI = Array.from({ length: 24 }, (_, index) => 48 + index).filter((midi) => WHITE_PITCHES.has(midi % 12));
const BLACK_MIDI = Array.from({ length: 24 }, (_, index) => 48 + index).filter((midi) => !WHITE_PITCHES.has(midi % 12));

export default function BeePracticeScreen() {
  const [phase, setPhase] = useState<ListenPhase>('idle');
  const [reading, setReading] = useState<Reading | null>(null);
  const [noteIndex, setNoteIndex] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const stableFramesRef = useRef(0);
  const noteIndexRef = useRef(0);
  const repeatGateRef = useRef<RepeatGate | null>(null);

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

  const stopListening = useCallback(async (nextPhase: ListenPhase = 'idle') => {
    generationRef.current += 1;
    await releaseAudio();
    setPhase(nextPhase);
  }, [releaseAudio]);

  const startListening = useCallback(async (force = false) => {
    if (!force && ['requesting', 'listening', 'complete'].includes(phase)) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === 'undefined') {
      setPhase('unsupported');
      return;
    }

    const generation = ++generationRef.current;
    stableFramesRef.current = 0;
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
        const frame = pitchFromBuffer(buffer, context.sampleRate, SEQUENCE_MINIMUM_RMS);
        const repeatGate = repeatGateRef.current;
        if (!frame) {
          stableFramesRef.current = 0;
          if (repeatGate?.stage === 'release') {
            repeatGate.stage = 'attack';
            repeatGate.releaseRms = SEQUENCE_MINIMUM_RMS;
          } else if (repeatGate?.stage === 'attack') {
            repeatGate.releaseRms = SEQUENCE_MINIMUM_RMS;
          }
          return;
        }

        const nextReading = makeReading(frame.frequency);
        const midi = midiFromReading(nextReading);
        setReading(nextReading);
        const target = BEE_SONG_SCORE[noteIndexRef.current];
        if (!target) return;

        if (repeatGate?.stage === 'release') {
          stableFramesRef.current = 0;
          if (midi !== repeatGate.midi) {
            repeatGate.stage = 'attack';
            repeatGate.releaseRms = SEQUENCE_MINIMUM_RMS;
          } else if (frame.rms <= repeatGate.rms * 0.55) {
            repeatGate.stage = 'attack';
            repeatGate.releaseRms = frame.rms;
          }
          return;
        }
        if (repeatGate?.stage === 'attack') {
          const attackThreshold = Math.max(repeatGate.releaseRms * 1.4, repeatGate.rms * 0.55);
          const reattacked = midi === target.midi && frame.rms >= attackThreshold;
          if (!reattacked) {
            stableFramesRef.current = 0;
            if (frame.rms < repeatGate.releaseRms) repeatGate.releaseRms = frame.rms;
            return;
          }
          repeatGateRef.current = null;
          stableFramesRef.current = 0;
        }

        const matched = matchesSequenceNote(
          midi,
          nextReading.cents,
          frame.clarity,
          target.midi,
          frame.rms,
        );
        stableFramesRef.current = matched ? stableFramesRef.current + 1 : 0;
        if (stableFramesRef.current < SEQUENCE_STABLE_FRAMES_REQUIRED) return;

        stableFramesRef.current = 0;
        const nextIndex = noteIndexRef.current + 1;
        const nextTarget = BEE_SONG_SCORE[nextIndex];
        if (nextTarget?.midi === target.midi) {
          repeatGateRef.current = {
            stage: 'release',
            midi: target.midi,
            rms: frame.rms,
            releaseRms: SEQUENCE_MINIMUM_RMS,
          };
        }
        noteIndexRef.current = nextIndex;
        setNoteIndex(nextIndex);
        if (nextIndex >= BEE_SONG_SCORE.length) {
          generationRef.current += 1;
          setPhase('complete');
          void releaseAudio();
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
  }, [phase, releaseAudio, stopListening]);

  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  useEffect(() => {
    const timer = window.setTimeout(() => void startListeningRef.current(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const detectedMidi = reading ? midiFromReading(reading) : null;
  const errorMessage = phase === 'denied'
    ? '請允許麥克風。'
    : phase === 'unavailable'
      ? '找不到麥克風。'
      : phase === 'unsupported'
        ? '瀏覽器無法使用麥克風。'
        : phase === 'error'
          ? '麥克風連線中斷。'
          : null;
  const restartSequence = async () => {
    await stopListening('idle');
    stableFramesRef.current = 0;
    noteIndexRef.current = 0;
    repeatGateRef.current = null;
    setNoteIndex(0);
    setReading(null);
    void startListeningRef.current(true);
  };

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter bee-practice-content" aria-labelledby="bee-practice-title">
          <h1 id="bee-practice-title" className="sr-only">小蜜蜂練習</h1>
          <div className="bee-score-sheet" role="group" aria-label={`小蜜蜂樂譜，已彈 ${noteIndex} / ${BEE_SONG_SCORE.length} 個音`}>
            <div className="bee-score-image-stage">
              <img src={beeScoreImage} alt="小蜜蜂樂譜" />
              <svg className="bee-score-note-overlay" viewBox="0 0 468 58" aria-hidden="true">
                {BEE_SONG_SCORE.map((note, index) => (
                  <ellipse
                    key={`${note.midi}-${index}`}
                    cx={note.x}
                    cy={note.y}
                    rx="4.3"
                    ry="3.1"
                    className={index < noteIndex ? 'bee-score-note is-played' : 'bee-score-note'}
                    data-testid={`bee-score-note-${index}`}
                  />
                ))}
              </svg>
            </div>
          </div>

          <p className="bee-song-status" role="status" aria-live="polite" data-testid="bee-song-progress">
            {phase === 'complete' ? '完成！' : `已彈 ${noteIndex} / ${BEE_SONG_SCORE.length} 個音`}
          </p>

          <section className="lesson-keyboard-card bee-practice-keyboard-card" aria-label="鋼琴鍵盤">
            <div className="lesson-keyboard" role="group" aria-label="兩個八度的鋼琴鍵盤，偵測到的音符會亮起">
              <div className="white-keys">
                {WHITE_MIDI.map((midi) => {
                  const noteIndexForKey = midi % 12;
                  const octave = Math.floor(midi / 12) - 1;
                  const highlighted = detectedMidi === midi;
                  return (
                    <div
                      key={midi}
                      className={`lesson-white-key ${highlighted ? 'key-active' : ''}`}
                      aria-label={`${KEY_NAMES[noteIndexForKey]}${octave}${highlighted ? '，目前偵測到' : ''}`}
                      data-testid={`bee-key-note-${midi}`}
                    >
                      {highlighted && <span className="key-glint" aria-hidden="true" />}
                      <span className="white-key-label">{KEY_NAMES[noteIndexForKey]}<small>{octave}</small></span>
                    </div>
                  );
                })}
              </div>
              <div className="black-keys" aria-hidden="true">
                {BLACK_MIDI.map((midi) => {
                  const precedingWhites = WHITE_MIDI.filter((whiteMidi) => whiteMidi < midi).length;
                  return (
                    <span
                      key={midi}
                      className={`lesson-black-key ${detectedMidi === midi ? 'key-active' : ''}`}
                      style={{ left: `${(precedingWhites / WHITE_MIDI.length) * 100}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          {errorMessage && (
            <div className="bee-song-actions">
              <p className="lesson-error" role="status" aria-live="polite">{errorMessage}</p>
              <button type="button" className="lesson-restart" onClick={() => void startListening(true)}>
                重試
              </button>
            </div>
          )}
          {phase === 'complete' && (
            <div className="lesson-practice-actions">
              <button type="button" className="lesson-restart" onClick={() => void restartSequence()} data-testid="button-restart-bee-song">
                再彈一次
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
