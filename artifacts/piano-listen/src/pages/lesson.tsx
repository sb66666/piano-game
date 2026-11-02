import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Check, Headphones, Mic, MicOff, Music2, Sparkles } from 'lucide-react';
import { makeReading, midiFromReading, NOTE_TW, pitchFromBuffer, type Reading } from '@/lib/pitch';

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
    if (phase === 'requesting' || phase === 'listening' || phase === 'complete') return;
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

  const detectedMidi = reading ? midiFromReading(reading) : null;
  const targetMidi = 60;
  const phaseMessage: Record<LessonPhase, string> = {
    idle: '準備好了嗎？按下聆聽，再彈一個音。',
    requesting: '請在瀏覽器提示出現時，允許使用麥克風。',
    listening: reading
      ? detectedMidi === targetMidi
        ? '快找到中央 Do 了，讓琴音再穩穩地響一下。'
        : `聽見 ${NOTE_TW[reading.noteIndex]}${reading.octave} 了。試著往中央 Do 靠近一點。`
      : '我正在聽。輕輕彈下一個琴鍵，讓聲音自然延續。',
    denied: '麥克風權限尚未開啟。請到瀏覽器的網站設定允許麥克風，再試一次。',
    unavailable: '目前找不到可用的麥克風，請確認裝置已連接，或關閉正在使用麥克風的其他程式。',
    unsupported: '這個瀏覽器暫時無法使用麥克風收音，請改用新版瀏覽器並以安全連線開啟。',
    error: '收音中斷了。確認麥克風狀態後，再重新開始聆聽吧。',
    complete: '就是這個音！你找到了中央 Do，第一步已經穩穩踏出。',
  };
  const isListening = phase === 'listening';
  const isError = ['denied', 'unavailable', 'unsupported', 'error'].includes(phase);

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <header className="lesson-header">
          <button type="button" className="lesson-back" onClick={() => { void stopListening(); setLocation('/'); }} data-testid="button-lesson-home">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>返回首頁</span>
          </button>
          <div className="lesson-brand">
            <span className="lesson-brand-mark"><Music2 size={17} aria-hidden="true" /></span>
            <span>琴音練習室</span>
          </div>
          <span className="lesson-counter">第 01 課 <i aria-hidden="true" /> 01 / 01</span>
        </header>

        <section className="lesson-content page-enter" aria-labelledby="lesson-instruction">
          <div className="lesson-eyebrow"><span /> 第一個音 · 中央 C</div>
          <div className={`lesson-dialogue ${phase === 'complete' ? 'is-complete' : ''}`}>
            <span className="dialogue-spark dialogue-spark-one" aria-hidden="true">✳</span>
            <span className="dialogue-spark dialogue-spark-two" aria-hidden="true">✳</span>
            <div className="dialogue-label"><Sparkles size={14} aria-hidden="true" /> 今天的小任務</div>
            <h1 id="lesson-instruction">{phase === 'complete' ? '太好了，你找到了！' : '彈下中央 Do 吧！'}</h1>
            <p>不用急，讓耳朵帶路。找到中間那個 Do 就完成了。</p>
            <div className="dialogue-tail" aria-hidden="true" />
          </div>

          <div className="lesson-progress" aria-label={phase === 'complete' ? '課程已完成' : '正在進行第一個音的練習'}>
            <span className={`progress-dot ${phase === 'complete' ? 'done' : 'current'}`}>{phase === 'complete' ? <Check size={12} /> : '1'}</span>
            <span className="progress-line" />
            <span className={`progress-dot ${phase === 'complete' ? 'done' : ''}`}>{phase === 'complete' ? <Check size={12} /> : '✓'}</span>
            <span className="progress-caption">{phase === 'complete' ? '第一課完成' : '找到中央 Do'}</span>
          </div>

          <section className="lesson-keyboard-card" aria-labelledby="keyboard-title">
            <div className="keyboard-heading">
              <div>
                <p className="lesson-overline">聽見音符，就看見它</p>
                <h2 id="keyboard-title">琴鍵會替你亮起來</h2>
              </div>
              <div className={`listen-indicator ${isListening ? 'is-live' : ''}`} role="status" aria-live="polite">
                <span />
                {phase === 'requesting' ? '連接中' : isListening ? '正在聆聽' : phase === 'complete' ? '已找到' : '等待開始'}
              </div>
            </div>
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
            <p className="keyboard-caption">
              {reading
                ? <>目前聽見 <strong>{NOTE_TW[reading.noteIndex]}{reading.octave}</strong><span className="caption-frequency">{reading.frequency.toFixed(1)} Hz</span></>
                : '中央 Do 就在這排琴鍵中間，標記好的鍵是今天的目標。'}
            </p>
          </section>

          <div className={`lesson-guidance ${isError ? 'guidance-error' : ''} ${phase === 'complete' ? 'guidance-success' : ''}`} role="status" aria-live="polite" data-testid="status-lesson-guidance">
            <span className="guidance-icon">{phase === 'complete' ? <Check size={17} /> : isError ? <MicOff size={17} /> : <Headphones size={17} />}</span>
            <p>{phaseMessage[phase]}</p>
          </div>

          <div className="lesson-actions">
            {isListening ? (
              <button type="button" className="lesson-primary lesson-stop" onClick={() => void stopListening()} data-testid="button-stop-lesson-listening">
                <MicOff size={17} aria-hidden="true" /> 停止聆聽
              </button>
            ) : phase === 'requesting' ? (
              <button type="button" className="lesson-primary" disabled aria-disabled="true" data-testid="button-lesson-requesting">
                <span className="lesson-loading-dot" aria-hidden="true" /> 正在連接麥克風…
              </button>
            ) : phase === 'complete' ? (
              <button type="button" className="lesson-primary lesson-complete-button" onClick={() => setLocation('/')} data-testid="button-lesson-complete-home">
                <Check size={17} aria-hidden="true" /> 帶著第一個音回首頁
              </button>
            ) : (
              <button type="button" className="lesson-primary" onClick={() => void startListening()} data-testid="button-start-lesson-listening">
                <Mic size={17} aria-hidden="true" /> {phase === 'idle' ? '開始聆聽' : '重新聆聽'}
              </button>
            )}
          </div>
          <p className="lesson-privacy"><Check size={13} aria-hidden="true" /> 不會錄音或上傳，音訊只在此裝置即時分析</p>
        </section>
        <footer className="lesson-footer"><span>循著琴音，走進森林深處</span><span>慢慢來，聽見就是進步</span></footer>
      </div>
    </main>
  );
}
