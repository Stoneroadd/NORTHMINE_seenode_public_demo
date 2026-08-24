import { useEffect } from 'react'

const SCRIPT_ID = 'northmine-public-analytics'
const SCRIPT_SOURCE = 'https://gc.zgo.at/count.js'
const COUNT_ENDPOINT = 'https://northmine.goatcounter.com/count'

/** Loads page analytics only inside the public route tree. */
export function PublicAnalytics() {
  useEffect(() => {
    if (document.getElementById(SCRIPT_ID)) return

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = SCRIPT_SOURCE
    script.dataset.goatcounter = COUNT_ENDPOINT
    document.head.append(script)

    return () => script.remove()
  }, [])

  return null
}
