import { useCallback, useEffect, useRef, useState } from "react";

// Counts down whole seconds (used for the "resend code" cooldown).
export function useCountdown(initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timer = useRef(null);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    timer.current = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer.current);
  }, [seconds]);

  const start = useCallback((value) => setSeconds(Math.max(0, Math.ceil(value))), []);
  return [seconds, start];
}
