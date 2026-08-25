// features/payments/components/payment-proof-upload.tsx
"use client"

import { useState } from "react"
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
import { uploadPaymentProof } from "@/lib/storage"
import { useSubmitPayment } from "../payments.hooks"
import { PAYMENT_METHOD_LABELS } from "../payments.constants"
import type { PaymentMethod } from "@/app/generated/prisma/client"

const METHODS = Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]

interface PaymentProofUploadProps {
  bookingId: string
  totalAmount: number
  onSuccess?: () => void
}

export function PaymentProofUpload({
  bookingId,
  totalAmount,
  onSuccess,
}: PaymentProofUploadProps) {
  const { mutate, isPending } = useSubmitPayment()

  const [method, setMethod] = useState<PaymentMethod>("GCASH")
  const [amount, setAmount] = useState(totalAmount.toString())
  const [referenceNumber, setReferenceNumber] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleSubmitWithRef = () => {
    mutate(
      {
        bookingId,
        method,
        amount: parseFloat(amount),
        referenceNumber: referenceNumber.trim(),
      },
      { onSuccess },
    )
  }

  const handleSubmitWithFile = async () => {
    if (!file) return
    setUploading(true)
    try {
      // TODO: Replace with real upload when Supabase is configured
      const proofImageUrl = await uploadPaymentProof(file, bookingId)
      mutate(
        {
          bookingId,
          method,
          amount: parseFloat(amount),
          proofImageUrl,
        },
        { onSuccess },
      )
    } finally {
      setUploading(false)
    }
  }

  const isLoading = isPending || uploading

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Payment Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {METHODS.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
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
            onClick={handleSubmitWithRef}
            disabled={isLoading || !referenceNumber.trim() || !amount}
          >
            {isLoading ? "Submitting…" : "Submit Payment"}
          </Button>
        </TabsContent>

        <TabsContent value="screenshot" className="space-y-3 pt-3">
          <div className="space-y-1.5">
            <Label>Upload Screenshot</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              {/* TODO: Remove this note once Supabase is wired up */}
              Note: File upload is not yet active. Please use the reference number tab for now.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleSubmitWithFile}
            disabled={isLoading || !file || !amount}
          >
            {isLoading ? "Uploading…" : "Upload & Submit"}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}
