import forestScene from '@assets/generated_images/piano-forest-home.jpg';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { TwoHandPracticeScore } from '@/components/two-hand-practice-score';
import { makeReading, midiFromReading, pitchFromBuffer, type Reading } from '@/lib/pitch';
import { TWO_HAND_STEPS } from '@/lib/two-hand-score';
import {
  matchesSequenceNote,
  SEQUENCE_MINIMUM_RMS,
  SEQUENCE_STABLE_FRAMES_REQUIRED,
} from '@/lib/piano-sequence';

type ListenPhase = 'idle' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'unsupported' | 'error' | 'complete';
type RepeatGate = { stage: 'release' | 'attack'; midi: number; rms: number; releaseRms: number };

export default function TwoHandScoreScreen() {
  const [, setLocation] = useLocation();
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
        const target = TWO_HAND_STEPS[noteIndexRef.current];
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
          const reattacked = target.accepts.includes(midi) && frame.rms >= attackThreshold;
          if (!reattacked) {
            stableFramesRef.current = 0;
            if (frame.rms < repeatGate.releaseRms) repeatGate.releaseRms = frame.rms;
            return;
          }
          repeatGateRef.current = null;
          stableFramesRef.current = 0;
        }

        const matched = target.accepts.some((targetMidi) => matchesSequenceNote(
          midi,
          nextReading.cents,
          frame.clarity,
          targetMidi,
          frame.rms,
        ));
        stableFramesRef.current = matched ? stableFramesRef.current + 1 : 0;
        if (stableFramesRef.current < SEQUENCE_STABLE_FRAMES_REQUIRED) return;

        stableFramesRef.current = 0;
        const nextIndex = noteIndexRef.current + 1;
        const nextTarget = TWO_HAND_STEPS[nextIndex];
        if (nextTarget?.accepts.includes(midi)) {
          repeatGateRef.current = {
            stage: 'release',
            midi,
            rms: frame.rms,
            releaseRms: SEQUENCE_MINIMUM_RMS,
          };
        }
        noteIndexRef.current = nextIndex;
        setNoteIndex(nextIndex);
        if (nextIndex >= TWO_HAND_STEPS.length) {
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

  const currentStep = TWO_HAND_STEPS[Math.min(noteIndex, TWO_HAND_STEPS.length - 1)];
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
    <main className="lesson-shell forest-lesson" style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 17, 15, .72), rgba(5, 17, 15, .86)), url("${forestScene}")` }}>
      <div className="lesson-wrap">
        <section className="lesson-content page-enter bee-practice-content" aria-labelledby="two-hand-title">
          <p className="lesson-eyebrow forest-eyebrow"><span />左右手一起彈</p>
          <h1 id="two-hand-title" className="forest-title">小蜜蜂雙手練習</h1>
          <TwoHandPracticeScore stepIndex={noteIndex} />

          <p className="bee-song-status" role="status" aria-live="polite" data-testid="two-hand-progress">
            {phase === 'complete' ? '完成！' : `已彈 ${noteIndex} / ${TWO_HAND_STEPS.length} 步`}
          </p>

          {phase !== 'complete' && (
            <div className="two-hand-now" data-testid="two-hand-current-note" aria-live="polite">
              <span className="two-hand-now-label">現在要彈</span>
              <div className="two-hand-now-notes">
                {currentStep.right && (
                  <div className="two-hand-now-note">
                    <small>右手</small>
                    <strong>{currentStep.right.solfege}</strong>
                    <em>{currentStep.right.name}</em>
                  </div>
                )}
                {currentStep.left && (
                  <div className="two-hand-now-note">
                    <small>左手</small>
                    <strong>{currentStep.left.solfege}</strong>
                    <em>{currentStep.left.name}</em>
                  </div>
                )}
              </div>
              {reading && <span className="two-hand-heard">聽到：{reading.note}{reading.octave}</span>}
            </div>
          )}

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
              <button type="button" className="lesson-restart" onClick={() => void restartSequence()} data-testid="button-restart-two-hand">
                再彈一次
              </button>
              <button type="button" className="lesson-home" onClick={() => setLocation('/')} data-testid="button-two-hand-home">
                回首頁
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
