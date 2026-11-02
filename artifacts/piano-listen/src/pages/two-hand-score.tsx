import { TwoHandScoreSheet } from '@/components/two-hand-score-sheet';

export default function TwoHandScoreScreen() {
  return (
    <main className="lesson-shell two-hand-shell">
      <div className="two-hand-wrap page-enter">
        <h1 className="sr-only">小蜜蜂雙手樂譜</h1>
        <TwoHandScoreSheet />
      </div>
    </main>
  );
}
