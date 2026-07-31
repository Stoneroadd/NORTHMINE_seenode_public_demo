import { ApiError, apiFetch } from '../lib/api'
import type {
  DemoAccessRequestAdminRecord,
  DemoAccessRequestList,
  DemoAccessRequestPayload,
  DemoAccessRequestReceipt,
  DemoAccessRequestStatus,
} from '../types/demoAccess'

const API_PATH = '/api/demo-access/requests'

async function parsePublicResponse<T>(response: Response): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = null
  }

  if (!response.ok) {
    const detail =
      body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string'
        ? body.detail
        : 'No fue posible enviar la solicitud.'
    throw new ApiError(response.status, detail)
  }

  return body as T
}

export async function submitDemoAccessRequest(
  payload: DemoAccessRequestPayload,
): Promise<DemoAccessRequestReceipt> {
  const response = await fetch(API_PATH, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  })

  return parsePublicResponse<DemoAccessRequestReceipt>(response)
}

export function listDemoAccessRequests(
  status?: DemoAccessRequestStatus,
): Promise<DemoAccessRequestList> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<DemoAccessRequestList>(`${API_PATH}${query}`)
}

export function getDemoAccessRequest(id: string): Promise<DemoAccessRequestAdminRecord> {
  return apiFetch<DemoAccessRequestAdminRecord>(`${API_PATH}/${encodeURIComponent(id)}`)
}

export function reviewDemoAccessRequest(
  id: string,
  action: 'approve' | 'reject',
  internalNotes = '',
): Promise<DemoAccessRequestAdminRecord> {
  return apiFetch<DemoAccessRequestAdminRecord>(
    `${API_PATH}/${encodeURIComponent(id)}/${action}`,
    {
      method: 'POST',
      body: JSON.stringify({ internal_notes: internalNotes }),
    },
  )
}
