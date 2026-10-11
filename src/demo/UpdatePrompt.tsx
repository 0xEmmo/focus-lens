import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/** A new build is waiting in the service worker; let the person choose when to reload. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 6000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  if (!needRefresh && !offlineReady) return null

  return (
    <div className="update" role="status">
      {needRefresh ? (
        <>
          <span>A newer version of Focus Lens is ready.</span>
          <button type="button" className="btn dark" onClick={() => void updateServiceWorker(true)}>
            Reload
          </button>
          <button type="button" className="btn" onClick={() => setNeedRefresh(false)}>
            Later
          </button>
        </>
      ) : (
        <>
          <span>Ready to work offline.</span>
          <button type="button" className="btn" onClick={() => setOfflineReady(false)}>
            OK
          </button>
        </>
      )}
    </div>
  )
}
