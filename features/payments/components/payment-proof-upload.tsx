// features/payments/components/payment-proof-upload.tsx
"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ImageIcon, Loader2, X } from "lucide-react"
import { validatePaymentProofFile } from "@/lib/storage"
import { useSubmitPayment } from "../payments.hooks"
import { PAYMENT_METHOD_LABELS } from "../payments.constants"
import type { PaymentMethod, PaymentType } from "@/app/generated/prisma/client"

// CHEQUE is only allowed for deposits
const STAFF_METHODS: PaymentMethod[] = ["GCASH", "MAYA", "BANK_TRANSFER", "CASH"]
const DEPOSIT_METHODS: PaymentMethod[] = ["GCASH", "MAYA", "BANK_TRANSFER", "CHEQUE", "CASH"]

interface PaymentProofUploadProps {
  bookingId: string
  paymentType: PaymentType
  installmentId?: string   // required when paymentType === INSTALLMENT
  defaultAmount?: number
  onSuccess?: () => void
}

export function PaymentProofUpload({
  bookingId,
  paymentType,
  installmentId,
  defaultAmount,
  onSuccess,
}: PaymentProofUploadProps) {
  const { mutate, isPending } = useSubmitPayment()

  const availableMethods =
    paymentType === "DEPOSIT" ? DEPOSIT_METHODS : STAFF_METHODS

  const [method, setMethod]               = useState<PaymentMethod>("GCASH")
  const [amount, setAmount]               = useState(defaultAmount?.toString() ?? "")
  const [referenceNumber, setReferenceNumber] = useState("")
  const [file, setFile]                   = useState<File | null>(null)
  const [fileError, setFileError]         = useState<string | null>(null)
  const fileInputRef                      = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    const validation = validatePaymentProofFile(selected)
    if (!validation.valid) {
      setFileError(validation.error ?? "Invalid file")
      setFile(null)
      return
    }
    setFileError(null)
    setFile(selected)
  }

  const clearFile = () => {
    setFile(null)
    setFileError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = (mode: "reference" | "screenshot") => {
    const base = {
      bookingId,
      paymentType,
      method,
      amount: parseFloat(amount),
      ...(paymentType === "INSTALLMENT" && installmentId ? { installmentId } : {}),
    }

    if (mode === "reference") {
      mutate({ input: { ...base, referenceNumber: referenceNumber.trim() } }, { onSuccess })
    } else {
      if (!file) return
      mutate({ input: base, file }, { onSuccess })
    }
  }

  const isLoading = isPending

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <Select
            value={method}
            onValueChange={(v) => setMethod(v as PaymentMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMethods.map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Amount (PHP)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      <Tabs defaultValue="reference">
        <TabsList className="w-full">
          <TabsTrigger value="reference" className="flex-1">
            Reference Number
          </TabsTrigger>
          <TabsTrigger value="screenshot" className="flex-1">
            Screenshot Upload
          </TabsTrigger>
        </TabsList>

        {/* ── Reference number tab ────────────────────────── */}
        <TabsContent value="reference" className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label>Reference / Transaction Number</Label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 1234567890"
            />
          </div>
          <Button
            className="w-full"
            onClick={() => handleSubmit("reference")}
            disabled={isLoading || !referenceNumber.trim() || !amount}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Submitting…</>
            ) : (
              "Submit Payment"
            )}
          </Button>
        </TabsContent>

        {/* ── Screenshot upload tab ───────────────────────── */}
        <TabsContent value="screenshot" className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label>Upload Screenshot</Label>

            {file ? (
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-4 text-muted-foreground" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(file.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            )}

            {fileError && (
              <p className="text-xs text-destructive">{fileError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Accepted: JPEG, PNG, WebP — max 5 MB
            </p>
          </div>

          <Button
            className="w-full"
            onClick={() => handleSubmit("screenshot")}
            disabled={isLoading || !file || !amount}
          >
            {isLoading ? (
              <><Loader2 className="mr-2 size-4 animate-spin" /> Uploading…</>
            ) : (
              "Upload & Submit"
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
