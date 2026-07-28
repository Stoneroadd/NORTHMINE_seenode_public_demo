import { useModuleT } from '../../i18n/useModuleT'
import { loginT } from '../../i18n/modules/login'

export function MineWireframeBackground() {
  const t = useModuleT(loginT)
  return (
    <svg className="mine-wireframe-svg" viewBox="0 0 1000 680" role="img" aria-label={t.wireframe_aria_label}>
      <defs>
        <pattern id="mineGrid" width="42" height="42" patternUnits="userSpaceOnUse">
          <path d="M 42 0 L 0 0 0 42" className="mine-grid-line" />
        </pattern>
        <linearGradient id="pitGlow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,212,255,0.16)" />
          <stop offset="52%" stopColor="rgba(57,255,20,0.12)" />
          <stop offset="100%" stopColor="rgba(245,255,250,0.04)" />
        </linearGradient>
        <radialGradient id="mineDepthGlow" cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="rgba(0,212,255,0.14)" />
          <stop offset="48%" stopColor="rgba(57,255,20,0.05)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <filter id="wireGlow">
          <feGaussianBlur stdDeviation="1.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1000" height="680" className="mine-wire-bg" />
      <rect width="1000" height="680" fill="url(#mineGrid)" opacity="0.68" />
      <rect width="1000" height="680" fill="url(#mineDepthGlow)" />

      <g className="mine-axis-layer">
        <path d="M64 600 L928 600" />
        <path d="M104 92 L104 626" />
        <path d="M104 600 L210 538 L332 480 L470 414 L638 334 L878 220" />
        <path d="M104 600 L198 612 M104 600 L104 506 M104 600 L210 538" />
      </g>

      <g className="mine-pit-wireframe" filter="url(#wireGlow)">
        <polygon points="116,204 684,82 918,262 842,548 312,626 74,420" />
        <polygon points="182,236 668,136 852,286 782,500 344,570 146,402" />
        <polygon points="250,268 646,190 780,308 718,452 378,512 220,386" />
        <polygon points="318,300 618,242 708,328 650,406 414,456 292,370" />
        <polygon points="390,328 578,290 638,342 588,378 454,406 374,364" />
        <polygon points="454,348 548,330 574,350 548,366 480,378 442,360" />
      </g>

      <g className="mine-bench-lines">
        <path d="M132 245 L268 222 L430 176 L654 136 L742 166 L806 210 L866 264" />
        <path d="M94 422 L228 382 L382 360 L552 318 L660 292 L744 272 L876 312" />
        <path d="M154 468 L278 438 L420 420 L604 370 L706 342 L762 348 L830 398" />
        <path d="M254 552 L392 514 L540 494 L716 444 L760 432 L790 430 L816 446" />
        <path d="M312 626 L456 568 L610 544 L842 548" />
      </g>

      <g className="mine-ramp-layer">
        <path id="route-haul-1" d="M128 430 L242 370 L340 386 L438 336 L566 278 L704 238 L872 286" />
        <path id="route-haul-2" d="M256 556 L356 486 L500 488 L604 420 L690 364 L746 330 L832 398" />
        <path id="route-loader-1" d="M322 304 L406 286 L518 266 L622 244 L670 254 L704 276 L734 306" />
        <path id="route-loader-2" d="M370 454 L470 424 L560 404 L654 374 L690 362 L724 372 L752 402" />
      </g>

      <g className="mine-depth-lines">
        <path d="M116 204 L182 236 L250 268 L318 300 L390 328 L454 348" />
        <path d="M684 82 L668 136 L646 190 L618 242 L578 290 L548 330" />
        <path d="M918 262 L852 286 L780 308 L708 328 L638 342 L574 350" />
        <path d="M842 548 L782 500 L718 452 L650 406 L588 378 L548 366" />
        <path d="M312 626 L344 570 L378 512 L414 456 L454 406 L480 378" />
        <path d="M74 420 L146 402 L220 386 L292 370 L374 364 L442 360" />
      </g>

      <g className="mine-coordinate-labels">
        <text x="72" y="78">DXF LAYER: PIT_DESIGN_042</text>
        <text x="72" y="96">RAJO DEMO / COMPAÑÍA DEMO</text>
        <text x="738" y="614">GRID WGS84 / DEMO TELEMETRY</text>
      </g>
    </svg>
  )
}
