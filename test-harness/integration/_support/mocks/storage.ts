// test-harness/integration/_support/mocks/storage.ts — stands in for lib/storage.ts (Supabase Storage)
export const storageLog: { signed: string[]; deleted: string[] } =
  ((globalThis as any).__itestStorage ??= { signed: [], deleted: [] })

export function validatePaymentProofFile(_file: File) {
  return { valid: true as const }
}

export async function uploadPaymentProof(_file: File, bookingId: string, paymentType: string) {
  return `${bookingId}/${paymentType}/itest.jpg`
}

export async function getSignedUrl(storagePath: string) {
  storageLog.signed.push(storagePath)
  return `https://storage.test/${storagePath}?token=itest`
}

export async function deletePaymentProof(storagePath: string) {
  storageLog.deleted.push(storagePath)
}
