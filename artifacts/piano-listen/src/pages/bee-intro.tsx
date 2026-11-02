import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function BeeIntroScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => setLocation('/bee-practice'), 3000);
    return () => window.clearTimeout(timer);
  }, [setLocation]);

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter" aria-labelledby="bee-intro-title">
          <div className="lesson-dialogue">
            <h1 id="bee-intro-title" className="lesson-prompt">
              現在我們來彈奏「小蜜蜂吧！」
            </h1>
          </div>
        </section>
      </div>
    </main>
  );
}
