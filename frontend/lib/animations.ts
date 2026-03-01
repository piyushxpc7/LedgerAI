import { useEffect, useRef, useState } from 'react'

/** Reveals element when it enters the viewport. Returns [ref, isVisible]. */
export function useReveal<T extends HTMLElement>(threshold = 0.12, once = true): [React.RefObject<T>, boolean] {
    const ref = useRef<T>(null!)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const obs = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true)
                    if (once) obs.disconnect()
                } else if (!once) {
                    setVisible(false)
                }
            },
            { threshold }
        )
        obs.observe(el)
        return () => obs.disconnect()
    }, [threshold, once])

    return [ref, visible]
}

/** Animates a number from 0 to `target` when `active` is true. */
export function useCountUp(target: number, active: boolean, duration = 1400): number {
    const [val, setVal] = useState(0)
    const started = useRef(false)

    useEffect(() => {
        if (!active || started.current) return
        started.current = true
        const start = performance.now()
        const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - t, 3)
            setVal(Math.round(eased * target))
            if (t < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
    }, [active, target, duration])

    return val
}

/** Returns a CSS transition string appropriate for enter/leave. */
export function revealStyle(visible: boolean, delay = 0): React.CSSProperties {
    return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.5s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }
}

export function revealStyleRight(visible: boolean, delay = 0): React.CSSProperties {
    return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(24px)',
        transition: `opacity 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.55s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }
}

export function revealStyleScale(visible: boolean, delay = 0): React.CSSProperties {
    return {
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.96)',
        transition: `opacity 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.4s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
    }
}
