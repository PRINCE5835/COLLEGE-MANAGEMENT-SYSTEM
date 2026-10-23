"use client";

import React, { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { markAttendanceAction, ScanResult } from "@/app/(student)/scan/actions";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  Camera,
  RefreshCw,
  Loader2,
  Clock,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Keyboard,
} from "lucide-react";

interface StudentQRScannerProps {
  studentName: string;
  enrollmentNumber: string;
}

export function StudentQRScanner({
  studentName,
  enrollmentNumber,
}: StudentQRScannerProps) {
  const [scannerActive, setScannerActive] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanSuccessData, setScanSuccessData] = useState<ScanResult | null>(null);
  const [manualInputMode, setManualInputMode] = useState<boolean>(false);
  const [manualToken, setManualToken] = useState<string>("");

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);

  const READER_ID = "interactive-qr-reader";

  // Trigger haptic vibration if supported on device
  const triggerHaptic = (type: "success" | "error") => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        if (type === "success") {
          navigator.vibrate([100, 50, 100]);
        } else {
          navigator.vibrate(300);
        }
      } catch {
        // Haptic failure safely ignored on non-supported platforms
      }
    }
  };

  const processDecodedToken = async (decodedText: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    // Call markAttendanceAction({ token, sessionId })
    const res = await markAttendanceAction({ token: decodedText });
    setIsProcessing(false);

    if (res.error) {
      triggerHaptic("error");
      setErrorMessage(res.error);
    } else {
      triggerHaptic("success");
      setScanSuccessData(res);
    }
  };

  const startScanner = async () => {
    setErrorMessage(null);
    setScanSuccessData(null);
    setIsProcessing(false);

    try {
      const html5QrCode = new Html5Qrcode(READER_ID);
      html5QrCodeRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          if (isScanningRef.current) return;
          isScanningRef.current = true;

          try {
            await html5QrCode.stop();
          } catch {
            // Scanner stop handled
          }

          setScannerActive(false);
          await processDecodedToken(decodedText);
        },
        () => {}
      );

      setScannerActive(true);
      isScanningRef.current = false;
    } catch (err: any) {
      setScannerActive(false);
      setErrorMessage(
        err?.message ||
          "Could not initialize camera feed. Please allow camera permissions or use the manual payload input below."
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // Scanner clear handled
      }
      setScannerActive(false);
      isScanningRef.current = false;
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    await processDecodedToken(manualToken.trim());
    setManualToken("");
  };

  useEffect(() => {
    if (!manualInputMode) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [manualInputMode]);

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Instantaneous Success Feedback Card */}
      {scanSuccessData && scanSuccessData.success && (
        <Card className="border-2 border-emerald-500/40 bg-emerald-500/5 shadow-xl text-center overflow-hidden animate-in fade-in zoom-in-95">
          <CardHeader className="bg-emerald-500/10 pb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="h-10 w-10 animate-in zoom-in duration-300" />
            </div>
            <Badge variant="success" className="mx-auto text-xs py-1 px-3 gap-1.5 font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              Verified & Marked Present
            </Badge>
            <CardTitle className="text-xl mt-2 text-foreground font-bold">
              Attendance Recorded
            </CardTitle>
            <CardDescription className="text-xs">
              Cryptographic Anti-Proxy verification confirmed &lt; 15s token freshness.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6 pb-4 text-left">
            <div className="p-4 rounded-xl border bg-card shadow-sm space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Subject:</span>
                <span className="font-semibold text-foreground text-right truncate max-w-[200px]">
                  {scanSuccessData.sessionDetails?.subjectName}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Code:</span>
                <span className="font-mono font-bold text-primary">
                  {scanSuccessData.sessionDetails?.subjectCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Student:</span>
                <span className="font-medium text-foreground">{studentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Enrollment No:</span>
                <span className="font-mono text-foreground font-semibold">{enrollmentNumber}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="h-3.5 w-3.5" /> Check-in Time:
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {scanSuccessData.sessionDetails?.markedAt
                    ? new Date(scanSuccessData.sessionDetails.markedAt).toLocaleTimeString()
                    : new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="pt-2 border-t">
            <Button
              onClick={() => {
                setScanSuccessData(null);
                setErrorMessage(null);
                startScanner();
              }}
              className="w-full gap-2 shadow-sm font-medium"
            >
              <RefreshCw className="h-4 w-4" /> Scan Another Session
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Error Feedback Banner */}
      {errorMessage && (
        <Card className="border-2 border-destructive/40 bg-destructive/10 text-destructive text-center animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-5 space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/20 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="text-sm font-bold">Scan Verification Failed</div>
            <p className="text-xs leading-relaxed text-destructive/90 max-w-xs mx-auto">
              {errorMessage}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setErrorMessage(null);
                startScanner();
              }}
              className="text-xs mt-2 border-destructive/40 hover:bg-destructive/20 text-destructive"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Retry Scanner
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Scanner Card */}
      {!scanSuccessData && (
        <Card className="border shadow-lg overflow-hidden">
          <CardHeader className="pb-3 text-center">
            <div className="flex items-center justify-between pb-1">
              <Badge variant="outline" className="text-[11px] gap-1 font-mono">
                <Smartphone className="h-3 w-3" /> Mobile Camera
              </Badge>
              <button
                type="button"
                onClick={() => {
                  stopScanner();
                  setManualInputMode(!manualInputMode);
                  setErrorMessage(null);
                }}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <Keyboard className="h-3 w-3" />
                {manualInputMode ? "Use Camera" : "Manual Paste"}
              </button>
            </div>

            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Dynamic QR Scanner
            </CardTitle>
            <CardDescription className="text-xs">
              Point your camera at the active 15-second rotating QR code on the classroom display.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 flex flex-col items-center">
            {manualInputMode ? (
              <form onSubmit={handleManualSubmit} className="w-full space-y-3 py-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-foreground/80">
                    Paste QR Payload Token:
                  </label>
                  <Input
                    placeholder="ACMS_QR.<sessionId>.<timestamp>.<salt>.<hmac>"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    className="font-mono text-xs"
                    disabled={isProcessing}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Direct validation for testing or devices without camera access.
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isProcessing || !manualToken.trim()}
                  className="w-full gap-2 text-xs"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
                    </>
                  ) : (
                    "Submit Token"
                  )}
                </Button>
              </form>
            ) : (
              <>
                <div className="relative w-full aspect-square max-w-[280px] rounded-2xl overflow-hidden bg-black/90 border-2 border-primary/30 flex items-center justify-center shadow-inner">
                  <div id={READER_ID} className="w-full h-full" />

                  {isProcessing && (
                    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-2.5 z-20">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        Validating Cryptographic Token...
                      </span>
                    </div>
                  )}
                </div>

                <div className="w-full mt-4 flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span>Student: <strong className="text-foreground">{enrollmentNumber}</strong></span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Token Freshness: &lt; 15s
                  </Badge>
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="pt-2 border-t flex justify-center">
            {!manualInputMode && !scannerActive && !isProcessing && (
              <Button onClick={startScanner} size="sm" className="gap-2 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Restart Camera
              </Button>
            )}
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
