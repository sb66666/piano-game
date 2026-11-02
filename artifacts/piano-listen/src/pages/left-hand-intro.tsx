import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function LeftHandIntroScreen() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = window.setTimeout(() => setLocation('/bass-clef'), 3000);
    return () => window.clearTimeout(timer);
  }, [setLocation]);

  return (
    <main className="lesson-shell">
      <div className="lesson-wrap">
        <section className="lesson-content page-enter" aria-labelledby="left-hand-intro-title">
          <div className="lesson-dialogue">
            <h1 id="left-hand-intro-title" className="lesson-prompt">
              很好！你已經學會了右手，接下來讓我們來繼續學習左手的部分吧！
            </h1>
          </div>
        </section>
      </div>
    </main>
  );
}
