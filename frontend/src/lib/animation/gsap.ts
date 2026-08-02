import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Vite HMR reloads this module on every edit; re-registering the same
// plugin instance is harmless but re-registering after a hot reload can
// leave stale ScrollTrigger instances pointing at unmounted DOM nodes.
// Guarding on a global flag (not a module-scope const, which HMR resets)
// keeps registration to once per page load.
const globalScope = globalThis as typeof globalThis & { __nmGsapRegistered?: boolean }

if (!globalScope.__nmGsapRegistered) {
  gsap.registerPlugin(ScrollTrigger)
  globalScope.__nmGsapRegistered = true
}

export { gsap, ScrollTrigger }
