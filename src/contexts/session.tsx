import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type SessionState = {
  bookId: number | null;
  page: number | null;
  isRunning: boolean;
  seconds: number;
  startedAt: number | null;
};

type SessionContextValue = SessionState & {
  start: (bookId: number, page?: number) => void;
  pause: () => void;
  finish: () => { duration: number; startDateISO: string; bookId: number | null; page: number | null };
  reset: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [bookId, setBookId] = useState<number | null>(null);
  const [page, setPage] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const tickRef = useRef<any>(null);

  useEffect(() => {
    if (!isRunning) {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
      return;
    }

    tickRef.current = setInterval(() => {
      const start = startedAt;
      if (!start) return;
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 500);

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isRunning, startedAt]);

  const start = useCallback((bId: number, p?: number) => {
    setBookId(bId);
    if (typeof p === "number") setPage(p);
    if (!startedAt) {
      setStartedAt(Date.now());
      setSeconds(0);
    } else {
      // resume from existing seconds
      setStartedAt(Date.now() - seconds * 1000);
    }
    setIsRunning(true);
  }, [startedAt, seconds]);

  const pause = useCallback(() => {
    if (startedAt) {
      const dur = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setSeconds(dur);
    }
    // keep startedAt so that `start()` can resume without resetting the timer
    setIsRunning(false);
  }, [startedAt]);

  const finish = useCallback(() => {
    let duration = seconds;
    if (startedAt) duration = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    const startDateISO = startedAt ? new Date(startedAt).toISOString() : new Date(Date.now() - duration * 1000).toISOString();
    // stop
    setIsRunning(false);
    setStartedAt(null);
    const result = { duration, startDateISO, bookId, page };
    // keep seconds value for UI
    setSeconds(duration);
    return result;
  }, [seconds, startedAt, bookId, page]);

  const reset = useCallback(() => {
    setBookId(null);
    setPage(null);
    setIsRunning(false);
    setSeconds(0);
    setStartedAt(null);
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ bookId, page, isRunning, seconds, startedAt, start, pause, finish, reset }), [bookId, page, isRunning, seconds, startedAt, start, pause, finish, reset]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
