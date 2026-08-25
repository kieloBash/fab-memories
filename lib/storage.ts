// lib/storage.ts
/**
 * Supabase Storage helpers for payment proof uploads.
 *
 * Bucket setup (run once in Supabase dashboard or CLI):
 *   - Bucket name : payment-proofs  (set in SUPABASE_STORAGE_BUCKET)
 *   - Public      : false  (private — access via signed URLs only)
 *   - File size   : 5 MB max
 *   - MIME types  : image/jpeg, image/png, image/webp
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   ← client-side uploads
 *   SUPABASE_SERVICE_ROLE_KEY       ← server-side signed URLs
 *   SUPABASE_STORAGE_BUCKET         ← defaults to "payment-proofs"
 */

import { supabase } from "./supabase/client"
import { supabaseAdmin } from "./supabase/server"

// ── Config ────────────────────────────────────────────────────

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "payment-proofs"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

// ── Validation ────────────────────────────────────────────────

export interface FileValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates a file before upload.
 * Call this client-side before calling uploadPaymentProof.
 */
export function validatePaymentProofFile(file: File): FileValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
    return {
      valid: false,
      error: "Only JPEG, PNG, and WebP images are accepted.",
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size must not exceed 5 MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
    }
  }

  return { valid: true }
}

// ── Upload (client-side) ──────────────────────────────────────

/**
 * Uploads a payment proof image to Supabase Storage.
 * Call this directly from the browser — uses the anon key client.
 *
 * Files are stored at: {bookingId}/{paymentType}/{timestamp}.{ext}
 * e.g. cldxyz123/deposit/1748000000000.jpg
 *
 * @param file        - Validated File object from the upload input
 * @param bookingId   - Used to namespace files per booking
 * @param paymentType - "deposit" | "installment" for sub-folder organisation
 * @returns           - The storage path (store this in Payment.proofStoragePath)
 */
export async function uploadPaymentProof(
  file: File,
  bookingId: string,
  paymentType: "deposit" | "installment",
): Promise<string> {
  const validation = validatePaymentProofFile(file)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const path = `${bookingId}/${paymentType}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  })

  if (error) {
    throw new Error(`Upload failed: ${error.message}`)
  }

  return path
}

// ── Signed URL (server-side) ──────────────────────────────────

/**
 * Generates a temporary signed URL for a private payment proof.
 * Call this server-side only — uses the service role key client.
 *
 * @param storagePath - The path returned by uploadPaymentProof
 * @param expiresIn   - Seconds until the URL expires (default: 1 hour)
 * @returns           - Temporary signed URL the client can use to view the image
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600,
): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error || !data?.signedUrl) {
    throw new Error(`Could not generate signed URL: ${error?.message ?? "unknown error"}`)
  }

  return data.signedUrl
}

/**
 * Deletes a payment proof from storage.
 * Used if a payment submission is rolled back due to a DB error.
 * Server-side only.
 */
export async function deletePaymentProof(storagePath: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .remove([storagePath])

  if (error) {
    // Log but don't throw — a dangling storage file is not fatal
    console.error(`[storage] Failed to delete ${storagePath}:`, error.message)
  }
}
