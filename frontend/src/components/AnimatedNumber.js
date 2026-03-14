import React, { useState, useEffect } from 'react';

/**
 * Animuje číslo od 0 do cílové hodnoty při načtení.
 */
export function AnimatedNumber({ value, duration = 1200, className = '' }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (value == null) return;
    const start = value >= 1 ? 1 : 0;
    setCount(start);
    const startTime = performance.now();
    const range = value - start;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.round(start + progress * range));
      if (progress < 1) requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);

  return <span className={className}>{count}</span>;
}
