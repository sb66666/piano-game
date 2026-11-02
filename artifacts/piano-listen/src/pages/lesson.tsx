import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { Check } from 'lucide-react';
import { makeReading, midiFromReading, pitchFromBuffer, type Reading } from '@/lib/pitch';

type LessonPhase = 'idle' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'unsupported' | 'error' | 'complete';

const KEY_NAMES = ['Do', '升 Do', 'Re', '升 Re', 'Mi', 'Fa', '升 Fa', 'Sol', '升 Sol', 'La', '升 La', 'Si'];
const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);
const WHITE_MIDI = Array.from({ length: 24 }, (_, index) => 48 + index).filter((midi) => WHITE_PITCHES.has(midi % 12));
const BLACK_MIDI = Array.from({ length: 24 }, (_, index) => 48 + index).filter((midi) => !WHITE_PITCHES.has(midi % 12));

export default function LessonScreen() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<LessonPhase>('idle');
  const [reading, setReading] = useState<Reading | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const stableCFramesRef = useRef(0);

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

  const startListening = useCallback(async () => {
    if (phase === 'requesting' || phase === 'listening') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === 'undefined') {
      setPhase('unsupported');
      return;
    }
    const generation = ++generationRef.current;
    stableCFramesRef.current = 0;
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
        const frame = pitchFromBuffer(buffer, context.sampleRate);
        if (!frame) {
          stableCFramesRef.current = 0;
          return;
        }
        const nextReading = makeReading(frame.frequency);
        setReading(nextReading);
        const isStableCentralC = midiFromReading(nextReading) === 60 && Math.abs(nextReading.cents) <= 35;
        stableCFramesRef.current = isStableCentralC ? stableCFramesRef.current + 1 : 0;
        if (stableCFramesRef.current >= 4) {
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
    const timer = window.setTimeout(() => {
      void startListeningRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const detectedMidi = reading ? midiFromReading(reading) : null;
  const targetMidi = 60;
  const targetDetected = Boolean(reading && detectedMidi === targetMidi && Math.abs(reading.cents) <= 35);
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

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter" aria-labelledby="lesson-instruction">
          <div className={`lesson-dialogue ${isError ? 'is-retryable' : ''}`}>
            {phase === 'complete' ? (
              <div className="lesson-success" role="status" aria-live="polite">
                <span className="success-check" aria-hidden="true"><Check className="success-check-mark" size={30} strokeWidth={3} /></span>
                <h1 id="lesson-instruction">成功！</h1>
              </div>
            ) : (
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
                彈下中央 Do 吧！
              </h1>
            )}
          </div>

          <section className="lesson-keyboard-card" aria-label="鋼琴鍵盤">
            <div className="lesson-keyboard" role="group" aria-label="兩個八度的鋼琴琴鍵，偵測到的音符會亮起">
              <div className="white-keys">
                {WHITE_MIDI.map((midi) => {
                  const noteIndex = midi % 12;
                  const octave = Math.floor(midi / 12) - 1;
                  const highlighted = detectedMidi === midi || (phase === 'complete' && midi === targetMidi);
                  const isDetectedTarget = midi === targetMidi && targetDetected;
                  return (
                    <div key={midi} className={`lesson-white-key ${highlighted ? 'key-active' : ''} ${midi === targetMidi ? 'key-target' : ''} ${isDetectedTarget ? 'key-target-detected' : ''}`} aria-label={`${KEY_NAMES[noteIndex]}${octave}${isDetectedTarget ? '，中央 Do 已偵測' : highlighted ? '，目前偵測到' : ''}`} data-testid={`key-note-${midi}`}>
                      {highlighted && <span className="key-glint" aria-hidden="true" />}
                      {isDetectedTarget && <span className="target-detected-check" aria-hidden="true"><Check size={13} strokeWidth={3} /></span>}
                      <span className="white-key-label">{KEY_NAMES[noteIndex]}<small>{octave}</small></span>
                      {midi === targetMidi && <span className="target-marker">中央 Do</span>}
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
            <p className="lesson-error" role="status" aria-live="polite" data-testid="status-lesson-error">{errorMessage}</p>
          )}
        </section>
        {phase === 'complete' && (
          <div className="lesson-completion-actions" data-testid="lesson-completion-actions">
            <button type="button" className="lesson-retry-button" onClick={() => void startListening()} data-testid="button-lesson-retry">再試一次</button>
            <button type="button" className="lesson-continue-button" onClick={() => setLocation('/listen')} data-testid="button-lesson-continue">繼續</button>
          </div>
        )}
      </div>
    </main>
  );
}
