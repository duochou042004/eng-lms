import { useEffect, useState } from 'react'

/** `value`, once it has stayed the same for `delayMs` (the 300 ms of the username checks, T-M2.5 scope 4). */
export function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
