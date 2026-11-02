import { useLocation } from 'wouter';
import { StaffChart } from '@/components/staff-chart';

const LETTERS = ['E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'];
const SOLFEGE = ['Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do'];

export default function BassClefScreen() {
  const [, setLocation] = useLocation();

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter staff-reading-content" aria-labelledby="bass-clef-title">
          <h1 id="bass-clef-title" className="staff-reading-title">低音譜號</h1>
          <StaffChart
            clefGlyph={'\uE062'}
            clefBaselineY={210}
            letters={LETTERS}
            solfege={SOLFEGE}
            markers={[{ index: 8, label: 'F' }, { index: 12, label: '中央 C' }]}
            ariaLabel="低音譜號上從低音 E 到中央 C 的音符位置"
          />
        </section>
        <footer className="flex justify-end pb-1 pt-4 sm:pb-2">
          <button
            type="button"
            className="min-h-12 min-w-24 rounded-full border border-[rgba(226,189,120,.68)] bg-[hsl(var(--primary))] px-7 font-medium tracking-[.08em] text-[hsl(var(--primary-foreground))] shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--primary))] active:translate-y-0"
            onClick={() => setLocation('/two-hand-score')}
            data-testid="button-bass-understood"
          >
            了解
          </button>
        </footer>
      </div>
    </main>
  );
}
