import { agentWidgetRegistry } from '../agentRegistry/registry'
import type { AgentGuidanceEffect, AgentGuidanceState } from '../agentRegistry/types'

export interface GuidanceActivity {
  actionId: string
  targetId: string
  effect: AgentGuidanceEffect
  durationMs: number
  label: string
  state: AgentGuidanceState
}

let current: GuidanceActivity | null = null
const listeners = new Set<() => void>()
let clearTimer: number | null = null

function notify(): void {
  listeners.forEach((listener) => listener())
}

function normalizeDuration(durationMs?: number): number {
  return Math.min(1500, Math.max(600, durationMs ?? 1000))
}

export const agentGuidance = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  snapshot(): GuidanceActivity | null {
    return current
  },
  resolveElement(targetId: string): HTMLElement | null {
    if (targetId.startsWith('widget:')) return agentWidgetRegistry.getElement(targetId.slice(7))
    return document.querySelector<HTMLElement>(`[data-agent-guidance-target="${CSS.escape(targetId)}"]`)
  },
  start(activity: Omit<GuidanceActivity, 'durationMs' | 'state'> & { durationMs?: number }): void {
    if (clearTimer !== null) window.clearTimeout(clearTimer)
    current = { ...activity, durationMs: normalizeDuration(activity.durationMs), state: 'targeting' }
    notify()
    window.requestAnimationFrame(() => {
      if (!current || current.actionId !== activity.actionId) return
      current = { ...current, state: 'executing' }
      notify()
    })
  },
  finish(actionId: string, succeeded: boolean): void {
    if (!current || current.actionId !== actionId) return
    current = { ...current, state: succeeded ? 'confirmed' : 'failed' }
    notify()
    clearTimer = window.setTimeout(() => {
      if (current?.actionId === actionId) {
        current = null
        notify()
      }
    }, succeeded ? 520 : 900)
  },
  clear(): void {
    if (clearTimer !== null) window.clearTimeout(clearTimer)
    current = null
    notify()
  },
}
