import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Activity, ArrowUpRight, AudioLines, Check, Mic, MicOff, Music2, ShieldCheck } from 'lucide-react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import forestScene from '@assets/generated_images/piano-forest-home.jpg';
import LessonScreen, { FiveNotePracticeScreen } from '@/pages/lesson';
import HandPositionScreen from '@/pages/hand-position';
import StaffReadingScreen from '@/pages/staff-reading';
import LeftHandIntroScreen from '@/pages/left-hand-intro';
import BassClefScreen from '@/pages/bass-clef';
import TwoHandScoreScreen from '@/pages/two-hand-score';
import BeeIntroScreen from '@/pages/bee-intro';
import BeePracticeScreen from '@/pages/bee-practice';
import { makeReading, NOTE_TW, pitchFromBuffer, type Reading } from '@/lib/pitch';

type Phase = 'idle' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'unsupported' | 'error';
const queryClient = new QueryClient();
const WAVE_HEIGHTS = [12, 20, 15, 29, 19, 36, 24, 42, 27, 35, 17, 31, 44, 23, 34, 18, 39, 26, 15, 32, 20, 42, 25, 35, 18, 29, 13, 22, 37, 21, 33, 16, 27, 40, 24, 14, 34, 19, 29, 12];

function ListenScreen() {
  const [, setLocation] = useLocation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [reading, setReading] = useState<Reading | null>(null);
  const [signal, setSignal] = useState(0);
  const [hasHeard, setHasHeard] = useState(false);
  const [hint, setHint] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<number | null>(null);
  const generationRef = useRef(0);
  const lastSignalRef = useRef(0);
  const heardRef = useRef(false);

  const releaseAudio = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const context = contextRef.current;
    contextRef.current = null;
    if (context && context.state !== 'closed') {
      try { await context.close(); } catch { /* Browser may close it during teardown. */ }
    }
  }, []);

  useEffect(() => () => {
    generationRef.current += 1;
    void releaseAudio();
  }, [releaseAudio]);

  const stopListening = useCallback(async (nextPhase: Phase = 'idle') => {
    generationRef.current += 1;
    await releaseAudio();
    setPhase(nextPhase);
    setSignal(0);
  }, [releaseAudio]);

  const startListening = useCallback(async () => {
    if (phase === 'requesting' || phase === 'listening') return;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.AudioContext === 'undefined') {
      setPhase('unsupported');
      setHint('');
      return;
    }
    const generation = ++generationRef.current;
    setPhase('requesting');
    setReading(null);
    setHasHeard(false);
    heardRef.current = false;
    setSignal(0);
    setHint('');
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
      const startedAt = performance.now();
      lastSignalRef.current = startedAt;
      setPhase('listening');
      timerRef.current = window.setInterval(() => {
        if (generation !== generationRef.current) return;
        analyser.getFloatTimeDomainData(buffer);
        const result = pitchFromBuffer(buffer, context.sampleRate);
        if (result) {
          lastSignalRef.current = performance.now();
          const next = makeReading(result.frequency);
          setReading(next);
          setHasHeard(true);
          heardRef.current = true;
          setSignal(Math.min(1, result.rms * 8));
          setHint('');
        } else {
          const now = performance.now();
          setSignal((current) => Math.max(0, current * 0.72));
          if (!heardRef.current && now - startedAt > 1900) setHint('尚未聽到清晰音符，請輕輕彈奏一個單音。');
          if (heardRef.current && now - lastSignalRef.current > 850) setHint('音符暫時離開收音範圍，保持聆聽或再彈一次。');
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

  const active = phase === 'listening';
  const cents = reading?.cents ?? 0;
  const needlePosition = `translateX(${Math.max(-49, Math.min(49, cents)) * 3.15}px)`;
  const phaseText: Record<Phase, string> = {
    idle: '準備就緒',
    requesting: '正在連接麥克風',
    listening: '正在聆聽',
    denied: '麥克風權限未開啟',
    unavailable: '找不到可用的麥克風',
    unsupported: '此瀏覽器不支援收音',
    error: '收音中斷',
  };

  const renderStatusMessage = () => {
    if (phase === 'denied') return '請在瀏覽器網址列旁的網站設定中允許麥克風，再回來重新開始。';
    if (phase === 'unavailable') return '請確認麥克風已連接、沒有被其他程式獨佔，並重新試一次。';
    if (phase === 'unsupported') return '請使用支援 Web Audio 的新版瀏覽器，並在安全連線（HTTPS）中開啟本頁。';
    if (phase === 'error') return '麥克風連線意外中斷。確認裝置狀態後，按下重新聆聽即可。';
    if (hint) return hint;
    if (phase === 'requesting') return '請在瀏覽器提示出現時，允許使用麥克風。';
    if (active && hasHeard) return '聽見了。再彈一個音，觀察音高與中央刻度的距離。';
    return '點擊下方按鈕後，彈奏單一琴鍵；讓音符自然延續一、兩秒。';
  };

  return (
    <main className="studio-shell">
      <div className="relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-[1180px] flex-col px-5 pb-8 pt-5 sm:px-9 sm:pt-8 lg:px-12">
        <header className="flex items-center justify-between border-b border-[hsl(var(--foreground)/.12)] pb-5 sm:pb-6">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
              <Music2 size={20} strokeWidth={1.7} aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-[17px] font-bold tracking-[.04em] sm:text-[18px]">琴音練習室</p>
              <p className="mt-0.5 text-[10px] tracking-[.18em] text-[hsl(var(--muted-foreground))]">LISTEN · LEARN · PLAY</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { void stopListening(); setLocation('/'); }} className="rounded-full px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]" data-testid="button-return-home">返回首頁</button>
            <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.11)] bg-[hsl(var(--card)/.64)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex">
              <ShieldCheck size={15} className="text-[hsl(var(--primary))]" aria-hidden="true" />
              <span>音訊僅在此裝置分析</span>
            </div>
          </div>
        </header>

        <section className="page-enter mx-auto flex w-full max-w-[860px] flex-1 flex-col pb-4 pt-10 sm:pt-[62px]">
          <div className="mb-8 text-center sm:mb-10">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.12)] bg-[hsl(var(--card)/.55)] px-3 py-1.5 text-[11px] tracking-[.12em] text-[hsl(var(--muted-foreground))]">
              <span className={`h-1.5 w-1.5 rounded-full ${active ? 'pulse-dot bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]'}`} />
              一間安靜的小小練習室
            </div>
            <h1 className="font-serif text-[30px] font-semibold tracking-[.055em] text-[hsl(var(--foreground))] sm:text-[40px]">聽見你彈出的音</h1>
            <p className="mx-auto mt-3 max-w-[440px] text-sm leading-6 text-[hsl(var(--muted-foreground))] sm:text-[15px]">
              輕輕彈下一個琴鍵，讓琴音練習室告訴你，麥克風聽見了什麼。
            </p>
          </div>

          <div className="readout-card relative overflow-hidden rounded-[28px] border border-[hsl(var(--foreground)/.10)] bg-[hsl(var(--card)/.86)] px-5 pb-6 pt-5 sm:px-9 sm:pb-8 sm:pt-7">
            <div className="absolute left-0 top-0 h-[3px] w-full bg-gradient-to-r from-[hsl(var(--primary)/.15)] via-[hsl(var(--primary)/.55)] to-[hsl(var(--accent)/.55)]" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[.13em] text-[hsl(var(--muted-foreground))]">
                <AudioLines size={16} aria-hidden="true" />
                即時音高讀數
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[hsl(var(--background))] px-3 py-1.5 text-[11px] font-medium text-[hsl(var(--muted-foreground))]" role="status" aria-live="polite" data-testid="status-microphone">
                <span className={`h-1.5 w-1.5 rounded-full ${active ? 'pulse-dot bg-[hsl(var(--primary))]' : phase === 'denied' || phase === 'error' || phase === 'unavailable' ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--accent))]'}`} />
                {phaseText[phase]}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 items-center gap-6 sm:mt-8 sm:grid-cols-[1fr_1.12fr] sm:gap-9">
              <div className="flex min-h-[190px] flex-col items-center justify-center rounded-[22px] bg-[hsl(var(--background)/.82)] px-4 py-5 sm:min-h-[234px]">
                <p className="text-[10px] font-semibold tracking-[.2em] text-[hsl(var(--muted-foreground))]">麥克風聽見</p>
                <div className="mt-1 flex items-baseline leading-none" aria-live="polite" aria-atomic="true" data-testid="text-detected-note">
                  <span className="font-serif text-[76px] font-semibold tracking-[-.075em] text-[hsl(var(--primary))] sm:text-[90px]">
                    {reading ? reading.note : '—'}
                  </span>
                  <span className="ml-1 font-serif text-[29px] font-medium text-[hsl(var(--muted-foreground))]">
                    {reading ? reading.octave : ''}
                  </span>
                </div>
                <p className="mt-2 text-[12px] tracking-[.13em] text-[hsl(var(--muted-foreground))]" data-testid="text-note-name">
                  {reading ? `音名 ${NOTE_TW[reading.noteIndex]}` : '彈奏後會顯示音名'}
                </p>
                <div className="mt-4 h-8 w-full max-w-[220px] overflow-hidden" aria-hidden="true">
                  <div className="flex h-full items-center justify-center gap-[3px]">
                    {WAVE_HEIGHTS.map((height, index) => {
                      const amplitude = active ? 0.36 + signal * 0.78 * (0.35 + (index % 7) / 10) : 0.34;
                      return <span key={index} className="wave-bar w-[3px] rounded-full bg-[hsl(var(--primary))]" style={{ height, opacity: active ? .4 + signal * .55 : .3, transform: `scaleY(${amplitude})` }} />;
                    })}
                  </div>
                </div>
              </div>

              <div className="px-1 sm:px-0">
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[.18em] text-[hsl(var(--muted-foreground))]">音準偏差</p>
                    <p className="mt-1 font-mono text-[28px] font-medium leading-none tracking-[-.04em] text-[hsl(var(--foreground))]" data-testid="text-cents">
                      {reading ? `${cents > 0 ? '+' : ''}${cents}` : '—'}
                      <span className="ml-1.5 text-[13px] tracking-normal text-[hsl(var(--muted-foreground))]">cent</span>
                    </p>
                  </div>
                  <p className="font-mono text-[12px] text-[hsl(var(--muted-foreground))]" data-testid="text-frequency">
                    {reading ? `${reading.frequency.toFixed(1)} Hz` : '— Hz'}
                  </p>
                </div>
                <div className="relative h-[106px] px-1" role="img" aria-label={reading ? `音準偏差 ${cents > 0 ? '高' : cents < 0 ? '低' : '準'} ${Math.abs(cents)} 音分` : '音準刻度，彈奏後顯示偏差'}>
                  <div className="absolute left-0 right-0 top-[44px] h-px bg-[hsl(var(--foreground)/.2)]" />
                  <div className="absolute left-1/2 top-[34px] h-[22px] w-px bg-[hsl(var(--foreground)/.42)]" />
                  {[-40, -20, 0, 20, 40].map((tick) => (
                    <div key={tick} className="absolute top-[39px] h-[11px] w-px bg-[hsl(var(--foreground)/.22)]" style={{ left: `${50 + tick}%` }} />
                  ))}
                  <div className="absolute left-1/2 top-[20px] tuner-needle" style={{ transform: `${needlePosition} translateX(-50%)` }}>
                    <div className={`mx-auto h-[32px] w-[2px] rounded-full ${reading ? Math.abs(cents) <= 5 ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--foreground)/.18)]'}`} />
                    <div className={`mx-auto -mt-[1px] h-[8px] w-[8px] rounded-full ring-[3px] ring-[hsl(var(--card))] ${reading ? Math.abs(cents) <= 5 ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--foreground)/.2)]'}`} />
                  </div>
                  <div className="absolute bottom-1 left-0 right-0 flex justify-between font-mono text-[9px] text-[hsl(var(--muted-foreground))]">
                    <span>−50</span><span>偏低</span><span className="font-sans text-[10px] font-semibold tracking-[.12em]">準</span><span>偏高</span><span>+50</span>
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span>低於標準音高</span>
                  <span>高於標準音高</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2.5 border-t border-[hsl(var(--foreground)/.09)] pt-4 text-[12px] leading-5 text-[hsl(var(--muted-foreground))]" aria-live="polite" data-testid="text-guidance">
              <Activity size={15} className="shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />
              <span>{renderStatusMessage()}</span>
            </div>

            <div className="mt-5 flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
              <p className="text-center text-[10px] leading-5 text-[hsl(var(--muted-foreground))] sm:text-left">
                不會錄音或上傳。停止聆聽時，麥克風會立即釋放。
              </p>
              {!active && phase !== 'requesting' ? (
                <button
                  type="button"
                  onClick={() => void startListening()}
                  className="group flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-full bg-[hsl(var(--primary))] px-7 text-sm font-semibold tracking-[.04em] text-[hsl(var(--primary-foreground))] shadow-[0_8px_20px_hsl(var(--primary)/.17)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_25px_hsl(var(--primary)/.23)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--primary)/.25)] sm:w-auto"
                  data-testid="button-start-listening"
                >
                  <Mic size={17} aria-hidden="true" />
                  {phase === 'idle' ? '開始聆聽' : '重新聆聽'}
                </button>
              ) : active ? (
                <button
                  type="button"
                  onClick={() => void stopListening()}
                  className="flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-full border border-[hsl(var(--foreground)/.16)] bg-[hsl(var(--card))] px-7 text-sm font-semibold text-[hsl(var(--foreground))] transition duration-200 hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--primary)/.2)] sm:w-auto"
                  data-testid="button-stop-listening"
                >
                  <MicOff size={17} aria-hidden="true" />
                  停止聆聽
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="flex min-h-[50px] w-full cursor-wait items-center justify-center gap-2.5 rounded-full bg-[hsl(var(--primary)/.74)] px-7 text-sm font-semibold text-[hsl(var(--primary-foreground))] sm:w-auto"
                  data-testid="button-requesting"
                >
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
                  正在連接…
                </button>
              )}
            </div>
          </div>

          <section className="mt-7 rounded-[22px] border border-[hsl(var(--foreground)/.09)] bg-[hsl(var(--card)/.46)] px-5 py-4 sm:px-6" aria-labelledby="howto-title">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="shrink-0">
                <p id="howto-title" className="text-xs font-semibold tracking-[.12em] text-[hsl(var(--foreground))]">讓讀數更清晰</p>
                <p className="mt-1 text-[10px] text-[hsl(var(--muted-foreground))]">一個音，一次專心聆聽</p>
              </div>
              <div className="h-px bg-[hsl(var(--foreground)/.1)] sm:h-9 sm:w-px" />
              <ol className="grid flex-1 grid-cols-1 gap-2.5 text-[11px] leading-[1.5] text-[hsl(var(--muted-foreground))] sm:grid-cols-3 sm:gap-3">
                <li className="flex items-start gap-2"><span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.1)] font-mono text-[10px] text-[hsl(var(--primary))]">1</span><span>將裝置放在鋼琴附近，避免碰觸麥克風。</span></li>
                <li className="flex items-start gap-2"><span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.1)] font-mono text-[10px] text-[hsl(var(--primary))]">2</span><span>一次彈奏一個音，讓琴音自然延續。</span></li>
                <li className="flex items-start gap-2"><span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-full bg-[hsl(var(--primary)/.1)] font-mono text-[10px] text-[hsl(var(--primary))]">3</span><span>等音符穩定後，查看音名與音準偏差。</span></li>
              </ol>
            </div>
          </section>

          <div className="mt-7 select-none px-1" aria-hidden="true">
            <div className="mx-auto flex max-w-[690px] justify-center opacity-[.78]">
              {Array.from({ length: 21 }, (_, i) => {
                const black = [1, 3, 6, 8, 10, 13, 15, 18, 20].includes(i);
                return (
                  <div key={i} className="relative flex-1">
                    <div className={`piano-key mx-[1px] h-[44px] rounded-b-[5px] border shadow-[0_2px_2px_rgba(46,57,48,.05)] sm:h-[51px] ${black ? 'absolute left-1/2 top-0 z-[1] h-[29px] w-[57%] -translate-x-1/2 rounded-b-[4px] border-[hsl(var(--foreground)/.12)] bg-[hsl(var(--foreground)/.78)] shadow-[0_3px_5px_rgba(31,38,33,.15)] sm:h-[34px]' : 'border-[hsl(var(--foreground)/.12)] bg-[hsl(var(--card)/.82)]'}`} />
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-center text-[9px] tracking-[.12em] text-[hsl(var(--muted-foreground)/.72)]">每一個琴鍵，都有自己的聲音</p>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-[hsl(var(--foreground)/.1)] pt-4 text-[10px] tracking-[.06em] text-[hsl(var(--muted-foreground))] sm:flex-row">
          <span>為練琴時刻而設計</span>
          <span className="flex items-center gap-1.5"><Check size={12} aria-hidden="true" />不儲存音訊 · 不需註冊</span>
        </footer>
      </div>
    </main>
  );
}

function Home() {
  const [, setLocation] = useLocation();
  const enterPractice = () => setLocation('/learn');
  return (
    <main className="forest-home flex min-h-[100dvh] items-center" style={{ backgroundImage: `url("${forestScene}")` }}>
      <div className="relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-[1440px] items-center px-7 py-12 sm:px-14 lg:px-[9.2vw]">
        <section className="home-copy page-enter w-full max-w-[520px] text-[hsl(43_45%_94%)]" aria-labelledby="home-title">
          <p className="mb-5 flex items-center gap-3 text-[11px] font-semibold tracking-[.28em] text-[hsl(39_78%_75%)] sm:text-xs">
            <span className="h-px w-9 bg-[hsl(39_78%_68%)]" aria-hidden="true" />
            初學者的第一段琴音
          </p>
          <h1 id="home-title" className="font-serif text-[42px] font-semibold leading-[1.28] tracking-[.08em] sm:text-[56px] lg:text-[64px]">學習鋼琴<br />模擬器</h1>
          <p className="mt-5 max-w-[370px] text-[14px] leading-7 text-[rgba(247,239,218,.78)] sm:text-[15px]">
            沿著燈火指引，從聽見每一個音開始。彈奏一個琴鍵，讓即時音高練習陪你熟悉琴音。
          </p>
          <div className="mt-9 flex max-w-[310px] flex-col gap-3.5">
            <button type="button" onClick={enterPractice} className="home-action group flex min-h-[56px] w-full items-center justify-between rounded-[3px] border border-[hsl(39_70%_67%/.76)] bg-[hsl(39_70%_57%/.93)] px-5 text-left text-[15px] font-semibold tracking-[.08em] text-[#1c2118] shadow-[0_10px_32px_rgba(8,10,6,.24)] hover:bg-[hsl(39_74%_66%)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(39_78%_72%/.55)]" data-testid="button-start-learning">
              <span>開始學習</span><ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" aria-hidden="true" />
            </button>
            <button type="button" onClick={enterPractice} className="home-action flex min-h-[54px] w-full items-center justify-between rounded-[3px] border border-[rgba(244,232,201,.38)] bg-[rgba(19,27,19,.38)] px-5 text-left text-[14px] font-medium tracking-[.08em] text-[hsl(43_45%_94%)] backdrop-blur-[3px] hover:border-[hsl(39_70%_67%/.8)] hover:bg-[rgba(19,27,19,.58)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(39_78%_72%/.55)]" data-testid="button-continue-learning">
              <span>繼續學習</span><ArrowUpRight size={17} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-7 flex items-center gap-2 text-[10px] tracking-[.1em] text-[rgba(247,239,218,.68)]" role="status" data-testid="status-home">
            <span className="h-1.5 w-1.5 rounded-full bg-[hsl(39_78%_68%)]" aria-hidden="true" />
            即時聆聽練習 · 無需帳戶
          </p>
        </section>
        <p className="absolute bottom-7 right-8 hidden text-[9px] tracking-[.24em] text-[rgba(247,239,218,.62)] md:block">循著琴音，走進森林深處</p>
      </div>
    </main>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/listen" component={ListenScreen} />
        <Route path="/learn" component={LessonScreen} />
        <Route path="/practice-five-notes" component={FiveNotePracticeScreen} />
        <Route path="/staff-reading" component={StaffReadingScreen} />
        <Route path="/bee-intro" component={BeeIntroScreen} />
        <Route path="/bee-practice" component={BeePracticeScreen} />
        <Route path="/left-hand-intro" component={LeftHandIntroScreen} />
        <Route path="/bass-clef" component={BassClefScreen} />
        <Route path="/two-hand-score" component={TwoHandScoreScreen} />
        <Route path="/course" component={LessonScreen} />
        <Route path="/hand-position" component={HandPositionScreen} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
