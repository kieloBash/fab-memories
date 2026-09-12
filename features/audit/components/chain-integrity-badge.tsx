// features/audit/components/chain-integrity-badge.tsx
"use client"

import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVerifyChainIntegrity } from "@/features/audit"
import { cn } from "@/lib/utils"

/**
 * The centerpiece of this module: a user-initiated, full-chain hash
 * verification. Every entry's stored hash is recomputed from its
 * current field values and checked both against itself and against
 * the next entry's recorded previousHash — proving (or disproving)
 * that no audit record has been altered since it was written, without
 * relying on "trust us, nobody edited the database."
 */
export function ChainIntegrityBadge() {
  const { mutate: verify, data: result, isPending } = useVerifyChainIntegrity()

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            !result ? "bg-primary-soft"
              : result.isValid ? "bg-emerald-50" : "bg-red-50",
          )}>
            {isPending ? (
              <Loader2 size={18} className="text-primary animate-spin" aria-hidden="true" />
            ) : !result ? (
              <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
            ) : result.isValid ? (
              <ShieldCheck size={18} className="text-emerald-600" aria-hidden="true" />
            ) : (
              <ShieldAlert size={18} className="text-red-600" aria-hidden="true" />
            )}
          </div>
          <div>
            <p className="text-[13px] font-semibold tracking-tight text-text-main">
              Tamper-evident hash chain
            </p>
            {!result && !isPending && (
              <p className="text-[11px] text-text-muted">
                Every audit entry is cryptographically chained to the one before it.
                Run a full verification to confirm nothing has been altered.
              </p>
            )}
            {isPending && (
              <p className="text-[11px] text-text-muted">Recomputing every entry's hash…</p>
            )}
            {result && result.isValid && (
              <p className="text-[11px] text-emerald-600">
                Verified — all {result.totalEntries} entries intact, chain unbroken.
                <span className="block text-text-muted mt-0.5">
                  Checked {new Date(result.verifiedAt).toLocaleString("en-PH")}
                </span>
              </p>
            )}
            {result && !result.isValid && (
              <p className="text-[11px] text-red-600">
                Integrity check failed at entry #{result.brokenAtSequence} of {result.totalEntries}.
                <span className="block mt-0.5">{result.reason}</span>
              </p>
            )}
          </div>
        </div>

        <Button
          size="sm"
          variant={result && !result.isValid ? "destructive" : "outline"}
          onClick={() => verify()}
          disabled={isPending}
        >
          {isPending ? "Verifying…" : result ? "Re-run check" : "Run integrity check"}
        </Button>
      </div>
    </div>
  )
}
