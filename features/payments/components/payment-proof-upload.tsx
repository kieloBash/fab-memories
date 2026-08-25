// features/payments/components/payment-proof-upload.tsx

"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageIcon, Loader2, X, Hash, Upload } from "lucide-react";
import { validatePaymentProofFile } from "@/lib/storage";
import { useSubmitPayment } from "../payments.hooks";
import { PAYMENT_METHOD_LABELS } from "../payments.constants";
import type { PaymentMethod, PaymentType } from "@/app/generated/prisma/client";

const DEPOSIT_METHODS: PaymentMethod[] = ["GCASH", "MAYA", "BANK_TRANSFER", "CHEQUE", "CASH"];
const INSTALLMENT_METHODS: PaymentMethod[] = ["GCASH", "MAYA", "BANK_TRANSFER", "CASH"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(n);

interface PaymentProofUploadProps {
  bookingId: string;
  paymentType: PaymentType;
  installmentId?: string;
  defaultAmount?: number;
  onSuccess?: () => void;
}

export function PaymentProofUpload({
  bookingId,
  paymentType,
  installmentId,
  defaultAmount,
  onSuccess,
}: PaymentProofUploadProps) {
  const { mutate, isPending } = useSubmitPayment();
  const availableMethods = paymentType === "DEPOSIT" ? DEPOSIT_METHODS : INSTALLMENT_METHODS;

  const [method, setMethod] = useState<PaymentMethod>("GCASH");
  const [amount, setAmount] = useState(defaultAmount?.toString() ?? "");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For installments, amount is fixed — don't let client change it
  const isAmountFixed = paymentType === "INSTALLMENT" && !!defaultAmount;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const validation = validatePaymentProofFile(selected);
    if (!validation.valid) {
      setFileError(validation.error ?? "Invalid file");
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (mode: "reference" | "screenshot") => {
    const base = {
      bookingId,
      paymentType,
      method,
      amount: parseFloat(amount),
      ...(paymentType === "INSTALLMENT" && installmentId ? { installmentId } : {}),
    };

    if (mode === "reference") {
      mutate({ input: { ...base, referenceNumber: referenceNumber.trim() } }, { onSuccess });
    } else {
      if (!file) return;
      mutate({ input: base, file }, { onSuccess });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h4 className="text-[14px] font-semibold tracking-tight text-text-main">
          {paymentType === "DEPOSIT" ? "Submit reservation deposit" : "Submit installment payment"}
        </h4>
        <p className="text-[12px] text-text-muted mt-0.5">
          {paymentType === "DEPOSIT"
            ? "Upload your proof of deposit. Your booking will be confirmed once verified by staff."
            : `Submit your proof of payment for ${defaultAmount ? fmt(defaultAmount) : "this installment"}.`}
        </p>
      </div>

      {/* Method + Amount */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Payment method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
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
          <Label className="text-[12px]">
            Amount (PHP)
            {isAmountFixed && (
              <span className="ml-1.5 text-[10px] text-text-muted font-normal">(fixed)</span>
            )}
          </Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => !isAmountFixed && setAmount(e.target.value)}
            readOnly={isAmountFixed}
            placeholder="0.00"
            className={isAmountFixed ? "bg-background-blush cursor-default" : ""}
          />
        </div>
      </div>

      {/* Proof tabs */}
      <Tabs defaultValue="reference">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="reference" className="flex items-center gap-1.5 text-[12px]">
            <Hash size={12} aria-hidden="true" />
            Reference number
          </TabsTrigger>
          <TabsTrigger value="screenshot" className="flex items-center gap-1.5 text-[12px]">
            <Upload size={12} aria-hidden="true" />
            Screenshot
          </TabsTrigger>
        </TabsList>

        {/* Reference number tab */}
        <TabsContent value="reference" className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Transaction / reference number</Label>
            <Input
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. 1234567890"
            />
            <p className="text-[11px] text-text-muted">
              Found in your GCash, Maya, or bank transfer receipt.
            </p>
          </div>
          <Button
            className="w-full"
            onClick={() => handleSubmit("reference")}
            disabled={isPending || !referenceNumber.trim() || !amount}
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Submitting…</>
            ) : (
              "Submit payment"
            )}
          </Button>
        </TabsContent>

        {/* Screenshot tab */}
        <TabsContent value="screenshot" className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Upload screenshot</Label>

            {file ? (
              <div className="flex items-center justify-between rounded-xl border border-border bg-background-blush px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon size={15} className="text-primary shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-text-main truncate">{file.name}</p>
                    <p className="text-[11px] text-text-muted">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button
                  onClick={clearFile}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 text-text-muted hover:text-red-500 transition-colors shrink-0 border-0 bg-transparent cursor-pointer"
                  aria-label="Remove file"
                >
                  <X size={13} aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background-blush p-6 cursor-pointer hover:border-primary/50 hover:bg-primary-soft/30 transition-colors">
                <Upload size={20} className="text-text-muted" aria-hidden="true" />
                <span className="text-[12px] text-text-muted">
                  Click to upload or drag and drop
                </span>
                <span className="text-[11px] text-text-muted">JPEG, PNG, WebP — max 5 MB</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            )}

            {fileError && (
              <p className="text-[12px] text-red-600">{fileError}</p>
            )}
          </div>

          <Button
            className="w-full"
            onClick={() => handleSubmit("screenshot")}
            disabled={isPending || !file || !amount}
          >
            {isPending ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Uploading…</>
            ) : (
              "Upload & submit"
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
