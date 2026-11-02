import { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Headphones,
  Mic,
  MicOff,
  Music2,
  Piano,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useLocation } from 'wouter';

type MicrophonePhase = 'idle' | 'requesting' | 'listening' | 'denied' | 'unavailable' | 'unsupported' | 'error';
type Note = { name: string; octave: number };
type DetectedNote = Note & { cents: number };

type CoursePageProps = {
  onPlayNote: (note: Note) => void;
  microphonePhase: MicrophonePhase;
  detectedNote: DetectedNote | null;
  onStartListening: () => void;
  onStopListening: () => void;
};

const LESSONS = [
  { number: '01', title: '找到中央 C', detail: '認識琴鍵上的起點', icon: Piano },
  { number: '02', title: '彈奏 C、D、E', detail: '讓三個音連成一句', icon: Music2 },
  { number: '03', title: '聽見自己的音', detail: '用麥克風辨認音高', icon: Headphones },
];

const WHITE_KEYS: Note[] = [
  { name: 'C', octave: 4 }, { name: 'D', octave: 4 }, { name: 'E', octave: 4 },
  { name: 'F', octave: 4 }, { name: 'G', octave: 4 }, { name: 'A', octave: 4 },
  { name: 'B', octave: 4 }, { name: 'C', octave: 5 },
];
const BLACK_KEYS: (Note & { after: number; label: string })[] = [
  { name: 'C♯', octave: 4, after: 0, label: '升 C' },
  { name: 'D♯', octave: 4, after: 1, label: '升 D' },
  { name: 'F♯', octave: 4, after: 3, label: '升 F' },
  { name: 'G♯', octave: 4, after: 4, label: '升 G' },
  { name: 'A♯', octave: 4, after: 5, label: '升 A' },
];

const PHASE_LABELS: Record<MicrophonePhase, string> = {
  idle: '等待開始',
  requesting: '正在連接麥克風',
  listening: '正在聆聽',
  denied: '尚未取得麥克風權限',
  unavailable: '找不到可用的麥克風',
  unsupported: '此瀏覽器不支援收音',
  error: '收音連線中斷',
};

function noteLabel(note: Note) {
  return `${note.name}${note.octave}`;
}

export default function CoursePage({
  onPlayNote,
  microphonePhase,
  detectedNote,
  onStartListening,
  onStopListening,
}: CoursePageProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [foundMiddleC, setFoundMiddleC] = useState(false);
  const [sequenceProgress, setSequenceProgress] = useState(0);
  const [lastPlayed, setLastPlayed] = useState<Note | null>(null);
  const [keyMessage, setKeyMessage] = useState('試著按下標記的 C4，找到鋼琴中央的起點。');

  const sequenceComplete = sequenceProgress >= 3;
  const targetMatches = detectedNote?.name === 'E' && detectedNote.octave === 4;
  const completedCount = Number(foundMiddleC) + Number(sequenceComplete) + Number(Boolean(targetMatches));
  const micActive = microphonePhase === 'listening';
  const micBusy = microphonePhase === 'requesting';

  const playKey = (note: Note) => {
    onPlayNote(note);
    setLastPlayed(note);

    if (currentStep === 1) {
      if (note.name === 'C' && note.octave === 4) {
        setFoundMiddleC(true);
        setKeyMessage('找到了！這個 C4 就是中央 C。你已經找到開始的地方。');
      } else if (!foundMiddleC) {
        setKeyMessage(`這是 ${noteLabel(note)}。再找找標記著 C4 的白鍵。`);
      }
    }

    if (currentStep === 2 && !sequenceComplete) {
      const expected: Note[] = [{ name: 'C', octave: 4 }, { name: 'D', octave: 4 }, { name: 'E', octave: 4 }];
      const next = expected[sequenceProgress];
      if (note.name === next.name && note.octave === next.octave) {
        const progress = sequenceProgress + 1;
        setSequenceProgress(progress);
        setKeyMessage(progress === 3
          ? '很好，C、D、E 都聽見了。三個音已經連成一小句。'
          : `對了，${note.name}。接著試試 ${expected[progress].name}。`);
      } else if (note.name === 'C' && note.octave === 4) {
        setSequenceProgress(1);
        setKeyMessage('從 C 再開始一次，接著依序彈 D、E。');
      } else {
        setSequenceProgress(0);
        setKeyMessage('沒關係，這一小句從 C 開始：C、D、E。');
      }
    }
  };

  const selectStep = (step: number) => {
    if (step <= currentStep || (step === 2 && foundMiddleC) || (step === 3 && sequenceComplete)) {
      setCurrentStep(step);
    }
  };

  const goForward = () => setCurrentStep((step) => Math.min(3, step + 1));
  const goBack = () => setCurrentStep((step) => Math.max(1, step - 1));

  const microphoneMessage = () => {
    if (microphonePhase === 'denied') return '瀏覽器目前不允許使用麥克風。請在網址列旁的網站設定中開啟權限，再重新開始。';
    if (microphonePhase === 'unavailable') return '沒有找到可用的麥克風。請確認裝置已連接，並檢查是否被其他程式占用。';
    if (microphonePhase === 'unsupported') return '這個瀏覽器無法使用即時收音。請改用較新的瀏覽器，並在安全連線中開啟課程。';
    if (microphonePhase === 'error') return '收音剛剛中斷了。確認麥克風連線後，可以再試一次。';
    if (micBusy) return '請留意瀏覽器的提示，允許使用麥克風即可繼續。';
    if (targetMatches) return '聽見 E4 了，正是我們要找的音。讓音符自然延續，感受它的高度。';
    if (detectedNote) return `聽見 ${noteLabel(detectedNote)}。目標是 E4；再彈一次，慢慢比較兩個音的高低。`;
    if (micActive) return '麥克風已準備好。請在附近的鋼琴上輕輕彈一個音，讓它延續一、兩秒。';
    return '準備好時開啟麥克風，再用真實鋼琴彈一個音。只有聽到音符後，這裡才會顯示辨認結果。';
  };

  return (
    <main className="studio-shell min-h-[100dvh]">
      <div className="relative z-[1] mx-auto flex min-h-[100dvh] w-full max-w-[1180px] flex-col px-4 pb-6 pt-5 sm:px-8 sm:pt-7 lg:px-12">
        <header className="flex items-center justify-between border-b border-[hsl(var(--foreground)/.12)] pb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
              <Music2 size={19} aria-hidden="true" />
            </div>
            <div>
              <p className="font-serif text-[17px] font-bold tracking-[.04em]">琴音練習室</p>
              <p className="mt-0.5 text-[10px] tracking-[.18em] text-[hsl(var(--muted-foreground))]">初學鋼琴 · 第一堂</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLocation('/')} className="min-h-10 rounded-full px-3 py-2 text-xs font-medium text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]" data-testid="button-course-home">
              返回首頁
            </button>
            <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--foreground)/.11)] bg-[hsl(var(--card)/.64)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex">
              <ShieldCheck size={15} className="text-[hsl(var(--primary))]" aria-hidden="true" />
              <span>每一步都可以慢慢來</span>
            </div>
          </div>
        </header>

        <div className="page-enter mx-auto w-full max-w-[930px] flex-1 pb-5 pt-7 sm:pt-10">
          <section className="mb-7 sm:mb-9" aria-labelledby="course-title">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold tracking-[.16em] text-[hsl(var(--primary))]">
              <Sparkles size={14} aria-hidden="true" />
              一堂約 5 分鐘的起步練習
            </div>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h1 id="course-title" className="font-serif text-[30px] font-semibold leading-tight tracking-[.045em] sm:text-[39px]">從一個琴鍵開始</h1>
                <p className="mt-2 max-w-[560px] text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  先找到中央 C，再彈出一小段旋律，最後聽聽看真實鋼琴的音高。
                </p>
              </div>
              <div className="min-w-[190px] rounded-2xl border border-[hsl(var(--foreground)/.09)] bg-[hsl(var(--card)/.6)] px-4 py-3">
                <div className="flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
                  <span>課程進度</span><span className="font-mono text-[hsl(var(--foreground))]" data-testid="text-course-progress">{completedCount} / 3 完成</span>
                </div>
                <div className="mt-2 flex gap-1.5" aria-label={`${completedCount} 堂，共 3 堂完成`}>
                  {LESSONS.map((lesson, index) => (
                    <span key={lesson.number} className={`h-[5px] flex-1 rounded-full ${index < completedCount ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--foreground)/.12)]'}`} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          <nav className="mb-6 grid grid-cols-3 gap-2 sm:mb-7 sm:gap-3" aria-label="課程步驟">
            {LESSONS.map((lesson, index) => {
              const step = index + 1;
              const done = step === 1 ? foundMiddleC : step === 2 ? sequenceComplete : Boolean(targetMatches);
              const active = currentStep === step;
              const locked = step === 2 ? !foundMiddleC : step === 3 ? !sequenceComplete : false;
              const Icon = lesson.icon;
              return (
                <button
                  key={lesson.number}
                  type="button"
                  onClick={() => selectStep(step)}
                  disabled={locked}
                  aria-current={active ? 'step' : undefined}
                  className={`group min-h-[86px] rounded-[18px] border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] sm:flex sm:items-center sm:gap-3 sm:px-4 ${active ? 'border-[hsl(var(--primary)/.4)] bg-[hsl(var(--card))] shadow-[0_7px_24px_hsl(var(--foreground)/.06)]' : 'border-[hsl(var(--foreground)/.09)] bg-[hsl(var(--card)/.46)]'} ${locked ? 'cursor-not-allowed opacity-55' : 'hover:border-[hsl(var(--primary)/.35)]'}`}
                  data-testid={`button-course-step-${step}`}
                >
                  <span className={`mb-2 grid h-8 w-8 place-items-center rounded-xl sm:mb-0 ${done ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : active ? 'bg-[hsl(var(--primary)/.11)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]'}`}>
                    {done ? <Check size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}
                  </span>
                  <span className="block min-w-0">
                    <span className="block text-[11px] font-semibold leading-4 sm:text-[13px]">{lesson.title}</span>
                    <span className="mt-1 block text-[9px] leading-4 text-[hsl(var(--muted-foreground))] sm:text-[10px]">{lesson.detail}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <section className="overflow-hidden rounded-[26px] border border-[hsl(var(--foreground)/.10)] bg-[hsl(var(--card)/.84)] shadow-[0_18px_54px_hsl(var(--foreground)/.055)]" aria-live="polite">
            <div className="flex items-center justify-between border-b border-[hsl(var(--foreground)/.09)] px-5 py-4 sm:px-7">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] tracking-[.12em] text-[hsl(var(--primary))]">STEP 0{currentStep}</span>
                <span className="h-4 w-px bg-[hsl(var(--foreground)/.15)]" />
                <h2 className="text-[14px] font-semibold tracking-[.04em]">{LESSONS[currentStep - 1].title}</h2>
              </div>
              <span className="rounded-full bg-[hsl(var(--background))] px-3 py-1.5 text-[10px] text-[hsl(var(--muted-foreground))]" data-testid="status-current-lesson">
                {currentStep === 1 && (foundMiddleC ? '已找到中央 C' : '找到 C4')}
                {currentStep === 2 && (sequenceComplete ? '旋律完成' : `已彈 ${sequenceProgress} / 3 個音`)}
                {currentStep === 3 && (targetMatches ? '辨認完成' : PHASE_LABELS[microphonePhase])}
              </span>
            </div>

            <div className="px-5 pb-5 pt-5 sm:px-7 sm:pb-7 sm:pt-6">
              {currentStep < 3 ? (
                <>
                  <div className="mb-5 flex items-start gap-3">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]">
                      {currentStep === 1 ? <Piano size={17} aria-hidden="true" /> : <Music2 size={17} aria-hidden="true" />}
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold">{currentStep === 1 ? '先認識琴鍵，再聽聽它的聲音。' : '照著順序彈奏，慢慢聽音與音之間的變化。'}</p>
                      <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">{currentStep === 1 ? '中央 C 是一個很好的起點。鍵盤上已標出 C4，按下它就完成這一步。' : '每次按下一個白鍵。若順序中斷，從 C 再來一次就好。'}</p>
                    </div>
                  </div>
                  {currentStep === 2 && (
                    <div className="mb-4 flex items-center justify-center gap-2" aria-label="C、D、E 演奏順序" data-testid="status-sequence">
                      {['C', 'D', 'E'].map((name, index) => (
                        <span key={name} className={`grid h-9 w-10 place-items-center rounded-xl font-mono text-sm transition ${index < sequenceProgress ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : index === sequenceProgress ? 'border border-[hsl(var(--primary)/.38)] bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))]'}`}>
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="relative mx-auto max-w-[700px] rounded-[18px] bg-[hsl(var(--secondary)/.62)] p-3 pb-4 pt-3 sm:p-5 sm:pb-5" role="group" aria-label="互動鋼琴鍵盤">
                    <div className="relative flex h-[150px] touch-manipulation sm:h-[188px]">
                      {WHITE_KEYS.map((note) => {
                        const isMiddleC = note.name === 'C' && note.octave === 4;
                        const last = lastPlayed?.name === note.name && lastPlayed.octave === note.octave;
                        return (
                          <button
                            key={noteLabel(note)}
                            type="button"
                            onClick={() => playKey(note)}
                            aria-label={`${noteLabel(note)}${isMiddleC ? '，中央 C' : ''}`}
                            aria-pressed={last}
                            className={`piano-key relative flex min-w-0 flex-1 flex-col justify-end rounded-b-[8px] border px-1 pb-3 text-center shadow-[0_3px_4px_hsl(var(--foreground)/.06)] focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--primary))] ${last ? 'translate-y-[3px] bg-[hsl(var(--primary)/.17)]' : 'bg-[hsl(var(--card))]'} ${isMiddleC ? 'border-[hsl(var(--primary)/.5)]' : 'border-[hsl(var(--foreground)/.12)]'}`}
                            data-testid={`button-piano-${note.name.toLowerCase()}-${note.octave}`}
                          >
                            <span className={`font-mono text-[12px] ${isMiddleC ? 'font-bold text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground)/.72)]'}`}>{note.name}</span>
                            {isMiddleC && <span className="mt-1 text-[8px] font-semibold leading-3 text-[hsl(var(--primary))]">中央 C</span>}
                            {!isMiddleC && <span className="mt-1 text-[8px] leading-3 text-[hsl(var(--muted-foreground))]">{note.octave === 5 ? '高音' : ''}</span>}
                          </button>
                        );
                      })}
                      {BLACK_KEYS.map((note) => (
                        <button
                          key={noteLabel(note)}
                          type="button"
                          onClick={() => playKey(note)}
                          aria-label={`${note.label}${note.octave}`}
                          className="piano-key absolute top-0 z-10 h-[91px] w-[8.1%] -translate-x-1/2 rounded-b-[6px] border border-[hsl(var(--foreground)/.22)] bg-[hsl(var(--foreground)/.82)] shadow-[0_5px_8px_hsl(var(--foreground)/.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] sm:h-[112px]"
                          style={{ left: `${((note.after + 1) / 8) * 100}%` }}
                          data-testid={`button-piano-${note.name.toLowerCase().replace('♯', 'sharp')}-${note.octave}`}
                        >
                          <span className="sr-only">{note.label}</span>
                        </button>
                      ))}
                    </div>
                    <p className="mt-3 text-center text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">可用滑鼠、觸控或 Tab 聚焦琴鍵，再按 Enter 或空白鍵演奏</p>
                  </div>
                  <p className={`mt-4 flex min-h-10 items-center gap-2.5 rounded-xl px-3 py-2 text-[11px] leading-5 ${currentStep === 1 && foundMiddleC || currentStep === 2 && sequenceComplete ? 'bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--background)/.8)] text-[hsl(var(--muted-foreground))]'}`} role="status" data-testid="status-key-feedback">
                    {currentStep === 1 && foundMiddleC || currentStep === 2 && sequenceComplete ? <CheckCircle2 size={15} className="shrink-0" aria-hidden="true" /> : <Activity size={15} className="shrink-0 text-[hsl(var(--primary))]" aria-hidden="true" />}
                    <span>{keyMessage}</span>
                  </p>
                </>
              ) : (
                <div className="grid gap-5 md:grid-cols-[1fr_.82fr] md:gap-7">
                  <div>
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]"><Headphones size={17} aria-hidden="true" /></span>
                      <div>
                        <p className="text-[13px] font-semibold">讓真實琴音帶你認識音高。</p>
                        <p className="mt-1 text-[11px] leading-5 text-[hsl(var(--muted-foreground))]">這次的目標是 <strong className="font-mono text-[hsl(var(--foreground))]">E4</strong>。開啟麥克風後，在鋼琴上彈一個音，看看聽見的是不是 E4。</p>
                      </div>
                    </div>
                    <div className="mt-5 rounded-[20px] border border-[hsl(var(--foreground)/.08)] bg-[hsl(var(--background)/.72)] p-5 text-center">
                      <p className="text-[9px] font-semibold tracking-[.19em] text-[hsl(var(--muted-foreground))]">目標音</p>
                      <div className="mt-1 font-serif text-[54px] font-semibold leading-none tracking-[-.06em] text-[hsl(var(--primary))]">E<span className="ml-1 text-[27px] text-[hsl(var(--muted-foreground))]">4</span></div>
                      <p className="mt-2 text-[10px] text-[hsl(var(--muted-foreground))]">聽見實際音符後，這裡會告訴你結果</p>
                    </div>
                    <div className={`mt-4 flex items-start gap-2.5 rounded-xl px-3 py-3 text-[11px] leading-5 ${['denied', 'unavailable', 'unsupported', 'error'].includes(microphonePhase) ? 'bg-[hsl(var(--destructive)/.08)] text-[hsl(var(--destructive))]' : targetMatches ? 'bg-[hsl(var(--primary)/.08)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--secondary)/.65)] text-[hsl(var(--muted-foreground))]'}`} role="status" data-testid="status-microphone-feedback">
                      {targetMatches ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" aria-hidden="true" /> : <Activity size={15} className="mt-0.5 shrink-0" aria-hidden="true" />}
                      <span>{microphoneMessage()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col rounded-[20px] border border-[hsl(var(--foreground)/.08)] bg-[hsl(var(--background)/.65)] p-5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold tracking-[.14em] text-[hsl(var(--muted-foreground))]">麥克風聽見</p>
                      <span className="flex items-center gap-1.5 text-[10px] text-[hsl(var(--muted-foreground))]" data-testid="status-microphone-phase">
                        <span className={`h-1.5 w-1.5 rounded-full ${micActive ? 'pulse-dot bg-[hsl(var(--primary))]' : ['denied', 'unavailable', 'error'].includes(microphonePhase) ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--accent))]'}`} />
                        {PHASE_LABELS[microphonePhase]}
                      </span>
                    </div>
                    <div className="my-auto py-6 text-center" aria-live="polite" aria-atomic="true" data-testid="text-detected-note">
                      {detectedNote ? (
                        <>
                          <div className="font-serif text-[60px] font-semibold leading-none tracking-[-.06em] text-[hsl(var(--primary))]">{detectedNote.name}<span className="ml-1 text-[27px] text-[hsl(var(--muted-foreground))]">{detectedNote.octave}</span></div>
                          <p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">{targetMatches ? '和目標 E4 一樣' : `${detectedNote.cents > 0 ? '稍高' : detectedNote.cents < 0 ? '稍低' : '音準穩定'} · 與目標 E4 比較看看`}</p>
                        </>
                      ) : (
                        <>
                          <div className="font-serif text-[60px] font-semibold leading-none tracking-[-.06em] text-[hsl(var(--foreground)/.18)]">—</div>
                          <p className="mt-3 text-[11px] text-[hsl(var(--muted-foreground))]">尚未辨認音符</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {micActive ? (
                        <button type="button" onClick={onStopListening} className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[hsl(var(--foreground)/.15)] bg-[hsl(var(--card))] px-5 text-xs font-semibold transition hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))]" data-testid="button-stop-listening">
                          <MicOff size={15} aria-hidden="true" />停止聆聽
                        </button>
                      ) : (
                        <button type="button" onClick={onStartListening} disabled={micBusy} className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 text-xs font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-wait disabled:opacity-70" data-testid="button-start-listening">
                          <Mic size={15} aria-hidden="true" />{micBusy ? '正在連接…' : microphonePhase === 'idle' ? '開始聆聽' : '重新聆聽'}
                        </button>
                      )}
                      <p className="flex items-center justify-center gap-1.5 text-[9px] text-[hsl(var(--muted-foreground))]"><ShieldCheck size={12} aria-hidden="true" />音訊只在此裝置即時分析</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 border-t border-[hsl(var(--foreground)/.09)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={goBack} disabled={currentStep === 1} className="flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-medium text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-previous-lesson">
                  <ArrowLeft size={15} aria-hidden="true" />上一步
                </button>
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={goForward}
                    disabled={currentStep === 1 ? !foundMiddleC : !sequenceComplete}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 text-xs font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] disabled:cursor-not-allowed disabled:opacity-45"
                    data-testid="button-next-lesson"
                  >
                    {currentStep === 1 ? '繼續練習 C、D、E' : '前往聽音練習'}<ArrowRight size={15} aria-hidden="true" />
                  </button>
                ) : (
                  <p className={`flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold ${targetMatches ? 'bg-[hsl(var(--primary)/.1)] text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'}`} role="status" data-testid="status-course-completion">
                    {targetMatches ? <><CheckCircle2 size={16} aria-hidden="true" />這堂課完成了，做得很好。</> : '聽見 E4 後，這堂課就完成了。'}
                  </p>
                )}
              </div>
            </div>
          </section>

          <p className="mt-5 flex items-center justify-center gap-2 text-center text-[10px] leading-5 text-[hsl(var(--muted-foreground))]">
            <span className="h-px w-5 bg-[hsl(var(--foreground)/.16)]" />
            不用趕進度，聽清楚一個音就已經很好
            <span className="h-px w-5 bg-[hsl(var(--foreground)/.16)]" />
          </p>
        </div>
      </div>
    </main>
  );
}
