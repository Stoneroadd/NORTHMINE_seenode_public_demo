import { CyberGridOverlay } from './CyberGridOverlay'
import { MatrixRain } from './MatrixRain'

export function CommandCenterBackground() {
  return (
    <>
      <div className="command-center-background" aria-hidden="true">
        <MatrixRain />
        <CyberGridOverlay />
      </div>
    </>
  )
}
