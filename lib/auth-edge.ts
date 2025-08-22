const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Convert string to ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str).buffer;
}

// Convert ArrayBuffer to base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Convert base64url to ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "="
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Generate HMAC key from secret
async function getHmacKey(): Promise<CryptoKey> {
  const keyData = stringToArrayBuffer(JWT_SECRET);
  return await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function generateToken(userId: number): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };

  const encodedHeader = arrayBufferToBase64Url(
    stringToArrayBuffer(JSON.stringify(header))
  );
  const encodedPayload = arrayBufferToBase64Url(
    stringToArrayBuffer(JSON.stringify(payload))
  );

  const data = `${encodedHeader}.${encodedPayload}`;
  const key = await getHmacKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToArrayBuffer(data)
  );
  const encodedSignature = arrayBufferToBase64Url(signature);

  return `${data}.${encodedSignature}`;
}

export async function verifyToken(
  token: string
): Promise<{ userId: number } | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    // Verify signature
    const data = `${encodedHeader}.${encodedPayload}`;
    const key = await getHmacKey();
    const signature = base64UrlToArrayBuffer(encodedSignature);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      stringToArrayBuffer(data)
    );
    if (!isValid) return null;

    // Decode payload
    const payloadBuffer = base64UrlToArrayBuffer(encodedPayload);
    const payloadString = new TextDecoder().decode(payloadBuffer);
    const payload = JSON.parse(payloadString);

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: payload.userId };
  } catch {
    return null;
  }
}
