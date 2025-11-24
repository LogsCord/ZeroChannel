import crypto from "crypto";

// Example server key (X25519 public key SPKI)
export const ZeroTEEPubKey = "MCowBQYDK2VuAyEA+Gqdf+iTfSXs2cm2bZvnKWpFyQf7RqIraUbXHrcu2gU=";

/**
 * Pad secret to fixed size with:
 * [4 bytes length][secret][random padding]
 */
export function padSecret(secret: Buffer, totalSize: number): Buffer {
    if (totalSize < 8)
        throw new Error("totalSize must be >= 8 bytes");

    const originalLength = secret.length;

    if (originalLength > (totalSize - 4))
        throw new Error(`Secret too large: ${originalLength} bytes, max allowed is ${totalSize - 4}`);

    // Prefix with 4 bytes length (Big Endian)
    const header = Buffer.alloc(4);
    header.writeUInt32BE(originalLength, 0);

    // Random padding to fill remaining space
    const paddingLength = totalSize - 4 - originalLength;
    const padding = crypto.randomBytes(paddingLength);

    return Buffer.concat([header, secret, padding]);
}

/**
 * Extract the original secret from padded format:
 * [4 bytes length][secret][padding...]
 */
export function unpadSecret(padded: Buffer): Buffer {
    if (padded.length < 4)
        throw new Error("Invalid padded secret: too small");

    const length = padded.readUInt32BE(0);

    if (length > padded.length - 4)
        throw new Error("Invalid padded secret: bad length header");

    return padded.subarray(4, 4 + length);
}

function generateX25519KeyPair(): { privateKey: crypto.KeyObject; publicKey: crypto.KeyObject } {
    const pair = crypto.generateKeyPairSync("x25519");
    return {
        privateKey: pair.privateKey,
        publicKey: pair.publicKey,
    };
}

function deriveSharedSecret(clientPrivate: crypto.KeyObject, serverPublic: string): Buffer {
    const publicKeyObj = crypto.createPublicKey({
        key: Buffer.from(serverPublic, "base64"),
        format: "der",
        type: "spki",
    });

    return crypto.diffieHellman({
        privateKey: clientPrivate,
        publicKey: publicKeyObj,
    });
}

function hkdf(sharedSecret: Buffer): Buffer {
    const key = crypto.hkdfSync(
        "sha256",
        sharedSecret,
        Buffer.from("zerochannel-vault"),
        Buffer.alloc(0),
        32
    );

    return Buffer.from(key);
}

export interface EncryptedAESGCMResult {
    cipherText: string;
    iv: string;
    tag: string;
}

export function encryptAESGCM(key: Buffer, data: Buffer): EncryptedAESGCMResult {
    const iv = crypto.randomBytes(12); // 96-bit IV recommended
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const encrypted = Buffer.concat([
        cipher.update(data),
        cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
        cipherText: encrypted.toString("base64"),
        iv: iv.toString("base64"),
        tag: tag.toString("base64")
    };
}

export interface EncryptedSecret {
    clientPublicKey: string;
    name: EncryptedAESGCMResult;
    value: EncryptedAESGCMResult;
}

/**
 * Encrypt BOTH name and value using the same
 * X25519+HKDF-derived AES-256-GCM key.
 */
export async function encryptSecretPayload(
    serverPublicKey: string,
    secretName: string,
    secretValue: string
): Promise<EncryptedSecret> {
    // 1) client ephemeral keypair
    const { privateKey, publicKey } = generateX25519KeyPair();

    // 2) shared secret
    const sharedSecret = deriveSharedSecret(privateKey, serverPublicKey);

    // 3) AES key from HKDF
    const aesKey = hkdf(sharedSecret);

    // 4) pad fields independently (diff sizes)
    const paddedName = padSecret(Buffer.from(secretName, "utf8"), 128);
    const paddedValue = padSecret(Buffer.from(secretValue, "utf8"), 512);

    // 5) encrypt BOTH name and value independently
    const encryptedName = encryptAESGCM(aesKey, paddedName);
    const encryptedValue = encryptAESGCM(aesKey, paddedValue);

    // 6) export client pubkey
    const clientPublicKey = publicKey
        .export({ format: "der", type: "spki" })
        .toString("base64");

    // 7) final ZeroVault v1 payload
    return {
        clientPublicKey,
        name: encryptedName,
        value: encryptedValue
    };
}
