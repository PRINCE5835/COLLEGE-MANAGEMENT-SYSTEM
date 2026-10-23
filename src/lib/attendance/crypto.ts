import crypto from "crypto";

const DEFAULT_SECRET =
  process.env.QR_ATTENDANCE_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "academiacore-enterprise-cms-qr-secret-key-2025";

const TOKEN_PREFIX = "ACMS_QR";

export interface AttendanceTokenData {
  token: string;
  sessionId: string;
  timestamp: number;
  salt: string;
  expiresInSeconds: number;
}

export interface TokenVerificationResult {
  valid: boolean;
  sessionId?: string;
  timestamp?: number;
  salt?: string;
  error?: string;
}

/**
 * Generates an expiring salted cryptographic token for dynamic QR code attendance.
 * Payload formula: session_id + timestamp + random_salt signed with SHA-256 HMAC.
 */
export function generateAttendanceToken(
  sessionId: string,
  secret: string = DEFAULT_SECRET
): AttendanceTokenData {
  const timestamp = Date.now();
  const salt = crypto.randomBytes(8).toString("hex");

  const payload = `${TOKEN_PREFIX}:${sessionId}:${timestamp}:${salt}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // Format: ACMS_QR.<sessionId>.<timestamp>.<salt>.<hmac>
  const token = `${TOKEN_PREFIX}.${sessionId}.${timestamp}.${salt}.${hmac}`;

  return {
    token,
    sessionId,
    timestamp,
    salt,
    expiresInSeconds: 15,
  };
}

/**
 * Validates the authenticity and freshness (<= 15 seconds) of an incoming QR token.
 */
export function verifyAttendanceToken(
  token: string,
  expectedSessionId?: string,
  secret: string = DEFAULT_SECRET,
  maxAgeSeconds: number = 18 // 15s window + 3s network latency margin
): TokenVerificationResult {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Invalid QR code payload: Token is missing." };
  }

  let sessionId = "";
  let timestamp = 0;
  let salt = "";
  let providedHmac = "";

  // Check for JSON-encoded or delimited token format
  if (token.startsWith("{") && token.endsWith("}")) {
    try {
      const parsed = JSON.parse(token);
      sessionId = parsed.sessionId || parsed.session_id || "";
      timestamp = Number(parsed.timestamp) || 0;
      salt = parsed.salt || "";
      providedHmac = parsed.hmac || parsed.signature || "";
    } catch {
      return { valid: false, error: "Malformed JSON payload in QR token." };
    }
  } else {
    const parts = token.split(".");
    if (parts.length === 5 && parts[0] === TOKEN_PREFIX) {
      // 5-part format with explicit salt: PREFIX.sessionId.timestamp.salt.hmac
      [, sessionId, , salt, providedHmac] = parts;
      timestamp = Number(parts[2]);
    } else if (parts.length === 4 && parts[0] === TOKEN_PREFIX) {
      // 4-part legacy format: PREFIX.sessionId.timestamp.hmac
      [, sessionId, , providedHmac] = parts;
      timestamp = Number(parts[2]);
      salt = "";
    } else {
      return {
        valid: false,
        error: "Unrecognized QR code format. Please ensure you are scanning the official classroom QR code.",
      };
    }
  }

  if (!sessionId || !timestamp || isNaN(timestamp) || !providedHmac) {
    return { valid: false, error: "Malformed cryptographic components in token." };
  }

  if (expectedSessionId && sessionId !== expectedSessionId) {
    return {
      valid: false,
      error: "Session mismatch: Token does not correspond to the targeted classroom session.",
    };
  }

  // Enforce strict 15-second freshness window
  const now = Date.now();
  const ageMs = now - timestamp;
  const ageSeconds = ageMs / 1000;

  if (ageSeconds > maxAgeSeconds) {
    return {
      valid: false,
      error: "QR Code expired. The 15-second validity window has lapsed. Please scan the refreshed QR code.",
    };
  }

  if (ageSeconds < -4) {
    return {
      valid: false,
      error: "Future timestamp detected. Client device clock is out of sync.",
    };
  }

  // Recompute HMAC
  const expectedPayload = salt
    ? `${TOKEN_PREFIX}:${sessionId}:${timestamp}:${salt}`
    : `${TOKEN_PREFIX}:${sessionId}:${timestamp}`;

  const expectedHmac = crypto
    .createHmac("sha256", secret)
    .update(expectedPayload)
    .digest("hex");

  const providedBuffer = Buffer.from(providedHmac, "hex");
  const expectedBuffer = Buffer.from(expectedHmac, "hex");

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return {
      valid: false,
      error: "Cryptographic signature mismatch. Unauthorized or forged QR token rejected.",
    };
  }

  return {
    valid: true,
    sessionId,
    timestamp,
    salt,
  };
}
