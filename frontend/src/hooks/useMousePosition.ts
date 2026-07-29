export interface MousePosition {
  x: number
  y: number
  active: boolean
}

export function useMousePosition() {
  return { x: 0, y: 0, active: false } satisfies MousePosition
}
