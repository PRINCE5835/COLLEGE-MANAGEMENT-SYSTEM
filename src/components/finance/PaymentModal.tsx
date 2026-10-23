"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building,
  DollarSign,
} from "lucide-react";
import { payInvoice } from "@/app/(student)/fees/actions";

interface PaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  onSuccess?: () => void;
}

export function PaymentModal({
  invoiceId,
  invoiceNumber,
  amountDue,
  onSuccess,
}: PaymentModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "netbanking" | "upi">("card");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    reference: string;
    message: string;
  } | null>(null);

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amountDue);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMsg(null);

    const methodName =
      paymentMethod === "card"
        ? "Visa/Mastercard"
        : paymentMethod === "netbanking"
        ? "Campus Direct NetBanking"
        : "Campus Student UPI";

    const res = await payInvoice(invoiceId, methodName);

    setIsProcessing(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessData({
        reference: res.transactionRef || "TXN-SUCCESS",
        message: res.message || "Payment settled successfully!",
      });
      setTimeout(() => {
        setIsOpen(false);
        setSuccessData(null);
        if (onSuccess) onSuccess();
      }, 2000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 h-8 text-xs font-semibold">
          <CreditCard className="h-3.5 w-3.5" /> Pay Now
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-4">
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-500" /> Secure Payment Gateway
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-mono">
              256-bit Encrypted
            </Badge>
          </div>
          <DialogDescription>
            Simulate tuition fee settlement for invoice{" "}
            <span className="font-mono text-foreground font-semibold">{invoiceNumber}</span>.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successData ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-8 w-8 animate-bounce" />
            </div>
            <div className="text-lg font-bold text-foreground">Payment Successful!</div>
            <p className="text-xs text-muted-foreground">
              Reference: <span className="font-mono text-foreground font-semibold">{successData.reference}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Your official receipt has been issued and is available for download.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePayment} className="space-y-4 py-2">
            <div className="p-4 rounded-xl border bg-muted/40 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Total Amount Due</span>
                <span className="text-2xl font-extrabold text-foreground">{formattedAmount}</span>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {invoiceNumber}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground/80">Select Payment Instrument</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === "card"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("netbanking")}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === "netbanking"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Building className="h-4 w-4" />
                  <span>NetBanking</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    paymentMethod === "upi"
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Direct UPI</span>
                </button>
              </div>
            </div>

            {paymentMethod === "card" && (
              <div className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Card Number</label>
                  <Input
                    defaultValue="4242 •••• •••• 4242"
                    readOnly
                    className="font-mono text-xs bg-muted/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Expiry Date</label>
                    <Input defaultValue="12/28" readOnly className="font-mono text-xs bg-muted/30" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">CVV / CVC</label>
                    <Input defaultValue="•••" readOnly className="font-mono text-xs bg-muted/30" />
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === "netbanking" && (
              <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                College institutional net-banking partner: <strong>Campus Federal Bank</strong>. Authorization auto-approved for testing.
              </div>
            )}

            {paymentMethod === "upi" && (
              <div className="p-3 rounded-lg border bg-muted/20 text-xs text-muted-foreground">
                Mock UPI ID: <strong className="font-mono">student@campuspay</strong>. Simulated instant transfer.
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isProcessing} className="gap-2">
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Authorizing...
                  </>
                ) : (
                  `Confirm ${formattedAmount}`
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
