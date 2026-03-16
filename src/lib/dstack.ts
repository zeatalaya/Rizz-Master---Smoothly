import crypto from "crypto";

let _client: ReturnType<typeof createLazyClient> | null = null;

function createLazyClient() {
  // Lazy import to avoid issues when SDK isn't available
  let clientPromise: Promise<InstanceType<typeof import("@phala/dstack-sdk").DstackClient>> | null = null;

  return {
    async getClient() {
      if (!clientPromise) {
        clientPromise = import("@phala/dstack-sdk").then((mod) => {
          // Use simulator endpoint if set, otherwise let SDK auto-detect
          // (default: /var/run/dstack.sock)
          const endpoint = process.env.DSTACK_SIMULATOR_ENDPOINT;
          return endpoint ? new mod.DstackClient(endpoint) : new mod.DstackClient();
        });
      }
      return clientPromise;
    },
  };
}

function getClientWrapper() {
  if (!_client) {
    _client = createLazyClient();
  }
  return _client;
}

export interface AttestationResult {
  quote: string;
  reportDataHex: string;
  timestamp: string;
}

/**
 * Generate a TDX attestation quote for the given data.
 * The data is SHA-256 hashed to fit the 64-byte reportData limit.
 */
export async function attestData(data: string | Buffer): Promise<AttestationResult> {
  const hash = crypto.createHash("sha256").update(data).digest();
  const client = await getClientWrapper().getClient();
  const result = await client.getQuote(hash);

  return {
    quote: result.quote,
    reportDataHex: hash.toString("hex"),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Derive a deterministic key from dstack, bound to this app's identity.
 */
export async function deriveKey(path: string): Promise<Uint8Array> {
  const client = await getClientWrapper().getClient();
  const response = await client.getKey(path);
  return response.key;
}

/**
 * Check if dstack TEE is available (simulator or real hardware).
 */
export async function isDstackAvailable(): Promise<boolean> {
  try {
    const client = await getClientWrapper().getClient();
    return await client.isReachable();
  } catch {
    return false;
  }
}

/**
 * Create an attested Rizz Master evaluation result.
 * Hashes the criteria result and gets a TDX quote proving it was computed in the TEE.
 */
export async function attestRizzMasterResult(result: {
  userId: string;
  userName: string;
  isRizzMaster: boolean;
  totalMatches: number;
  conversationsStartedWithReply: number;
  likesYouCount: number;
}): Promise<AttestationResult> {
  // Deterministic JSON for reproducible hashes
  const payload = JSON.stringify({
    type: "rizz-master-evaluation",
    userId: result.userId,
    userName: result.userName,
    isRizzMaster: result.isRizzMaster,
    criteria: {
      matches: { actual: result.totalMatches, required: 10, passed: result.totalMatches >= 10 },
      conversations: { actual: result.conversationsStartedWithReply, required: 5, passed: result.conversationsStartedWithReply >= 5 },
      likes: { actual: result.likesYouCount, required: 50, passed: result.likesYouCount >= 50 },
    },
    evaluatedAt: new Date().toISOString(),
  });

  return attestData(payload);
}
