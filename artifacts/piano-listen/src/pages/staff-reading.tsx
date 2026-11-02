import { useLocation } from 'wouter';
import { StaffChart } from '@/components/staff-chart';

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'A'];
const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do', 'Re', 'Mi', 'Fa', 'Sol', 'La'];

export default function StaffReadingScreen() {
  const [, setLocation] = useLocation();

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter staff-reading-content" aria-labelledby="staff-reading-title">
          <h1 id="staff-reading-title" className="staff-reading-title">高音譜號</h1>
          <StaffChart
            clefGlyph={'\uE050'}
            clefBaselineY={270}
            letters={LETTERS}
            solfege={SOLFEGE}
            markers={[{ index: 0, label: '中央 C' }, { index: 4, label: '中央 G' }]}
            ariaLabel="高音譜號上從中央 C 到高音 A 的音符位置"
          />
        </section>
        <footer className="flex justify-end pb-1 pt-4 sm:pb-2">
          <button
            type="button"
            className="min-h-12 min-w-24 rounded-full border border-[rgba(226,189,120,.68)] bg-[hsl(var(--primary))] px-7 font-medium tracking-[.08em] text-[hsl(var(--primary-foreground))] shadow-[0_8px_24px_rgba(0,0,0,.2)] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[hsl(var(--primary))] active:translate-y-0"
            onClick={() => setLocation('/bee-intro')}
            data-testid="button-staff-understood"
          >
            了解
          </button>
        </footer>
      </div>
    </main>
  );
}
