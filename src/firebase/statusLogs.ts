import { addDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'
import { app } from './config'

const db = getFirestore(app)

export type StatusEntityType = 'box' | 'order'

export interface StatusAuditLog {
  id?: string
  entityType: StatusEntityType
  entityId: string
  previousStatus: string
  nextStatus: string
  forced: boolean
  reason?: string
  performedBy: string
  performedAt: string
}

export async function logStatusChange(log: Omit<StatusAuditLog, 'performedAt'>) {
  const collectionRef = collection(db, 'statusLogs')

  // Firestore rejects fields with `undefined` values. Build a payload
  // that only includes keys with defined values to avoid addDoc errors.
  const payload: any = {
    entityType: log.entityType,
    entityId: log.entityId,
    forced: !!log.forced,
    performedBy: log.performedBy,
    performedAt: new Date().toISOString(),
  }

  if (typeof log.previousStatus !== 'undefined') payload.previousStatus = log.previousStatus
  if (typeof log.nextStatus !== 'undefined') payload.nextStatus = log.nextStatus
  if (typeof log.reason !== 'undefined') payload.reason = log.reason

  await addDoc(collectionRef, payload)
}

export async function fetchStatusLogs(entityType: StatusEntityType, entityId: string) {
  // To avoid requiring a composite index in Firestore (which happens when
  // combining multiple equality filters + an orderBy), query only by
  // `entityId` and perform the entityType filtering and ordering client-side.
  // This keeps the query index-free and is acceptable for log collections
  // which are typically small per entity.
  const logsQuery = query(
    collection(db, 'statusLogs'),
    where('entityId', '==', entityId)
  )

  const snapshot = await getDocs(logsQuery)
  const raw = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StatusAuditLog))

  // Filter by entityType in code (avoids composite index) and sort by
  // performedAt descending. performedAt is stored as an ISO string so
  // lexicographic sort works; use string compare to be safe.
  const filtered = raw
    .filter(l => l.entityType === entityType)
    .sort((a, b) => (b.performedAt || '').localeCompare(a.performedAt || ''))

  return filtered
}
