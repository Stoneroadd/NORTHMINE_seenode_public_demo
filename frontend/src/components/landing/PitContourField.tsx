interface PitContourFieldProps {
  className?: string
}

export function PitContourField({ className = '' }: PitContourFieldProps) {
  return (
    <svg
      className={`nm-strata-contours ${className}`.trim()}
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--1" d="M 280 47 L 275 63 L 269 87 L 258 113 L 439 83 L 607 150 L 635 206 L 634 202 L 652 210 L 659 238 L 617 265 L 531 298 L 429 328 L 395 333 L 255 317 L 247 340 L 219 323 L 174 320 L 126 258 L 184 182 L 142 193 L 104 197 L 109 213 L 80 236 L 42 272" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--2" d="M 360 30 L 351 48 L 349 58 L 345 60 L 342 68 L 350 70 L 343 79 L 306 87 L 368 95 L 529 79 L 573 114 L 621 129 L 658 145 L 606 307 L 579 322 L 522 340 L 418 364 L 345 370 L 315 354 L 226 353 L 218 364 L 201 368 L 191 375 L 192 391 L 203 405" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--3" d="M 450 24 L 432 30 L 426 43 L 425 54 L 428 61 L 417 67 L 422 76 L 481 86 L 531 76 L 612 117 L 654 136 L 620 295 L 603 310 L 553 335 L 485 348 L 395 368 L 351 379 L 296 377 L 269 375 L 255 367 L 215 370 L 236 393 L 216 401 L 206 406" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--4" d="M 732 112 L 723 141 L 736 149 L 723 154 L 716 165 L 707 173 L 697 181 L 688 197 L 683 209 L 678 234 L 714 244 L 711 253 L 693 267 L 666 278 L 651 288 L 640 302 L 642 319 L 622 329 L 622 342 L 548 382 L 564 393 L 613 388 L 592 398 L 603 412" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--5" d="M 388 327 L 286 315 L 272 307 L 249 308 L 199 313 L 163 270 L 161 257 L 139 291 L 139 307 L 138 248 L 165 219 L 179 188 L 308 116 L 381 96 L 540 100 L 601 142 L 615 210 L 639 219 L 644 256 L 615 263 L 589 282 L 552 286 L 444 313 L 388 327" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--6" d="M 590 53 L 580 58 L 590 70 L 568 78 L 584 93 L 643 118 L 670 223 L 634 283 L 628 291 L 579 338 L 517 349 L 517 359 L 513 363 L 488 366 L 483 379 L 474 382 L 474 393 L 413 400 L 400 403 L 392 417 L 365 415 L 338 419 L 305 433 L 303 455" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--7" d="M 425 314 L 390 317 L 327 314 L 247 284 L 254 220 L 297 181 L 353 156 L 312 168 L 299 170 L 268 162 L 254 146 L 299 128 L 339 120 L 378 121 L 423 132 L 395 141 L 428 133 L 436 131 L 447 125 L 463 120 L 512 124 L 584 141 L 593 193 L 555 263 L 508 284 L 436 313 L 425 314" />
      <path pathLength="1" className="nm-strata-contour nm-strata-contour--8" d="M 666 69 L 638 72 L 604 77 L 624 78 L 637 89 L 643 110 L 619 102 L 649 117 L 655 123 L 669 139 L 675 222 L 603 324 L 562 347 L 583 351 L 584 355 L 579 361 L 547 369 L 548 379 L 509 391 L 513 408 L 541 410 L 531 415 L 529 421 L 517 429 L 511 436 L 514 442" />
    </svg>
  )
}
