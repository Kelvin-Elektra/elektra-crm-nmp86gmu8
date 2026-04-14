import { useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordSubscription } from 'pocketbase'
import { isValidCollection } from '@/lib/pocketbase/collections'

/**
 * Hook for real-time subscriptions to a PocketBase collection.
 * ALWAYS use this hook instead of subscribing inline.
 * Uses the per-listener UnsubscribeFunc so multiple components
 * can safely subscribe to the same collection without conflicts.
 */
export function useRealtime(
  collectionName: string,
  callback: (data: RecordSubscription<any>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled || !collectionName || !isValidCollection(collectionName)) return

    let unsubscribeFn: (() => Promise<void>) | undefined
    let cancelled = false

    try {
      pb.collection(collectionName)
        .subscribe('*', (e) => {
          callbackRef.current(e)
        })
        .then((fn) => {
          if (cancelled) {
            fn().catch(() => {})
          } else {
            unsubscribeFn = fn
          }
        })
        .catch(() => {})
    } catch (err) {
      console.warn(`useRealtime failed for collection: ${collectionName}`, err)
    }

    return () => {
      cancelled = true
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}
