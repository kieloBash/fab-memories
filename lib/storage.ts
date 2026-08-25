// lib/storage.ts
/**
 * Storage helpers for payment proof uploads.
 *
 * TODO: Wire up Supabase Storage when ready.
 *
 * Required env vars (add when implementing):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_STORAGE_BUCKET   (e.g. "payment-proofs")
 *
 * Install when ready:
 *   npm install @supabase/supabase-js
 */

// TODO: Uncomment and implement when Supabase is configured
// import { createClient } from "@supabase/supabase-js"
//
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// )
//
// const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "payment-proofs"

/**
 * Uploads a payment proof image to Supabase Storage.
 *
 * @param file       - The File object from the client upload input
 * @param bookingId  - Used to namespace the file path (bookingId/filename)
 * @returns          - The public URL of the uploaded file
 *
 * TODO: Replace stub with real implementation:
 *
 * const ext = file.name.split(".").pop()
 * const path = `${bookingId}/${Date.now()}.${ext}`
 * const { error } = await supabase.storage.from(BUCKET).upload(path, file)
 * if (error) throw new Error(`Upload failed: ${error.message}`)
 * const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
 * return data.publicUrl
 */
export async function uploadPaymentProof(
  _file: File,
  _bookingId: string,
): Promise<string> {
  // STUB — returns a placeholder URL until Supabase is wired up
  console.warn("[storage] uploadPaymentProof is not yet implemented — returning placeholder URL")
  return `https://placeholder.storage/payment-proofs/${_bookingId}/${Date.now()}.jpg`
}

/**
 * Returns a signed URL for viewing a private payment proof image.
 * Use this for private buckets where files are not publicly accessible.
 *
 * @param path        - The storage path returned at upload time
 * @param expiresIn   - Seconds until the signed URL expires (default 1 hour)
 * @returns           - Temporary signed URL
 *
 * TODO: Replace stub with real implementation:
 *
 * const { data, error } = await supabase.storage
 *   .from(BUCKET)
 *   .createSignedUrl(path, expiresIn)
 * if (error) throw new Error(`Could not create signed URL: ${error.message}`)
 * return data.signedUrl
 */
export async function getSignedUrl(
  path: string,
  _expiresIn = 3600,
): Promise<string> {
  // STUB — returns the path as-is until Supabase is wired up
  console.warn("[storage] getSignedUrl is not yet implemented — returning path as-is")
  return path
}
