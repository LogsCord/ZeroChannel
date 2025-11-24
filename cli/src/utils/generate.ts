import fs from "fs";
import path from "path";
import crypto from "crypto";

function ensureDir(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function generateEd25519Keys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
    return {
        privateKeyPem: privateKey.export({ format: "pem", type: "pkcs8" }).toString(),
        publicKeyPem: publicKey.export({ format: "pem", type: "spki" }).toString(),
    };
}

function generateX25519Keys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("x25519");
    return {
        privateKeyBase64: privateKey.export({ format: "der", type: "pkcs8" }).toString("base64"),
        publicKeyBase64: publicKey.export({ format: "der", type: "spki" }).toString("base64"),
    };
}

function main() {
    const outputDir = path.join(process.cwd(), "vault-keys");
    ensureDir(outputDir);

    console.log("🔐 Generating ED25519 signing keypair...");
    const ed25519 = generateEd25519Keys();

    console.log("🔐 Generating X25519 ECDH keypair...");
    const x25519 = generateX25519Keys();

    console.log("📁 Writing files...");

    fs.writeFileSync(path.join(outputDir, "ed25519_private.pem"), ed25519.privateKeyPem);
    fs.writeFileSync(path.join(outputDir, "ed25519_public.pem"), ed25519.publicKeyPem);

    fs.writeFileSync(path.join(outputDir, "x25519_private.b64"), x25519.privateKeyBase64);
    fs.writeFileSync(path.join(outputDir, "x25519_public.b64"), x25519.publicKeyBase64);

    // Metadata JSON (useful for publishing public info)
    const metadata = {
        ed25519_public_key: ed25519.publicKeyPem,
        x25519_public_key: x25519.publicKeyBase64,
        created_at: new Date().toISOString(),
        algorithm: "vault_v1",
    };

    fs.writeFileSync(
        path.join(outputDir, "vault_metadata.json"),
        JSON.stringify(metadata, null, 4)
    );

    console.log("\n🎉 Keys generated successfully:");
    console.log(`- ${path.join(outputDir, "ed25519_private.pem")}`);
    console.log(`- ${path.join(outputDir, "ed25519_public.pem")}`);
    console.log(`- ${path.join(outputDir, "x25519_private.b64")}`);
    console.log(`- ${path.join(outputDir, "x25519_public.b64")}`);
    console.log(`- ${path.join(outputDir, "vault_metadata.json")}\n`);
}

main();
