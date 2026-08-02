import { useEffect, useState } from 'react'

/**
 * navigator.connection.saveData has no CSS/srcset equivalent — the browser
 * always picks the "best" srcset candidate for the viewport regardless of
 * the user's data-saver preference, so callers must branch manually to skip
 * the larger candidate and any non-essential secondary asset.
 */
export function useSaveData() {
  const [saveData, setSaveData] = useState(false)
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    setSaveData(Boolean(connection?.saveData))
  }, [])
  return saveData
}
