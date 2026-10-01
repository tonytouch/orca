import { useEffect, useState } from 'react'
import { UAO_ENDPOINTS_SAVED_EVENT } from '../../../shared/agent-os-endpoints'
import { useAppStore } from '@/store'

/** True when a CloudRoom URL is saved. Empty means the launch target stays hidden. */
export function useCloudroomConfigured(): boolean {
  const activeView = useAppStore((s) => s.activeView)
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      const getConfig = window.api?.agentOs?.getConfig
      if (!getConfig) {
        return
      }
      void getConfig()
        .then((config) => {
          if (!cancelled) {
            setConfigured(config.cloudroomUrl.trim().length > 0)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setConfigured(false)
          }
        })
    }
    load()
    window.addEventListener(UAO_ENDPOINTS_SAVED_EVENT, load)
    return () => {
      cancelled = true
      window.removeEventListener(UAO_ENDPOINTS_SAVED_EVENT, load)
    }
  }, [activeView])

  return configured
}
