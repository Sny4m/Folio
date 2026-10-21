import { useEffect, useRef } from 'react'
// Escape dismisses the most recently opened overlay.
const stack: { id: symbol; fn: () => void }[] = []
export function useBackHandler(active: boolean, fn: () => void) {
  const ref = useRef(fn); ref.current = fn
  useEffect(() => {
    if (!active) return
    const entry = { id: Symbol(), fn: () => ref.current() }; stack.push(entry)
    const listener = (e: KeyboardEvent) => { if (e.key === 'Escape' && stack[stack.length - 1] === entry) { e.preventDefault(); entry.fn() } }
    window.addEventListener('keydown', listener)
    return () => { stack.splice(stack.indexOf(entry), 1); window.removeEventListener('keydown', listener) }
  }, [active])
}
