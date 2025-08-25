import { mkdtemp, writeFile, cp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execa } from "execa";

type InspectConfig = {
    Config?: {
        Entrypoint?: string[] | string | null;
        Cmd?: string[] | string | null;
        WorkingDir?: string | null;
        Env?: string[] | null;
    };
    RepoTags?: string[];
};

function toArray(v?: string[] | string | null): string[] {
    if (!v)
        return [];

    return Array.isArray(v)
        ? v
        : [v];
}

/**
 * Recompose la commande finale (ENTRYPOINT + CMD) telle qu'elle serait exécutée
 * par Docker si on ne modifiait rien. On la placera en CMD du wrapper.
 */
function composeFinalCommand(entrypoint: string[], cmd: string[]): string[] {
    const final = [...entrypoint, ...cmd];

    if (final.length === 0)
        throw new Error("Image de base sans ENTRYPOINT ni CMD : impossible de déterminer la commande à exécuter.");

    return final;
}

function jsonArrayForDockerfile(arr: string[]): string {
    // On échappe proprement pour insérer dans le Dockerfile
    const escaped = arr.map((s) => JSON.stringify(s));

    return `[${escaped.join(", ")}]`;
}

export async function wrapImageWithZeroinit(params: {
    baseImage: string;          // ex: animeotv/test:main
    zeroinitHostPath: string;   // ex: ./bin/zeroinit (binaire côté host)
    outputTag?: string;         // ex: animeotv/test:main-zc
}): Promise<string> {
    const { baseImage, zeroinitHostPath } = params;
    const outputTag = params.outputTag ?? `${baseImage}-zc`;

    // 1) Inspect de l'image d'origine
    const { stdout } = await execa("docker", ["inspect", baseImage], { stdio: "pipe" });
    const inspected: InspectConfig[] = JSON.parse(stdout);

    if (!inspected.length)
        throw new Error(`Image introuvable: ${baseImage}`);

    const config = inspected[0].Config || {};
    const entrypoint = toArray(config.Entrypoint);
    const cmd = toArray(config.Cmd);
    const finalCmd = composeFinalCommand(entrypoint, cmd);

    // 2) Préparer un contexte de build temporaire
    const ctxDir = await mkdtemp(join(tmpdir(), "zc-wrap-"));
    const dockerfilePath = join(ctxDir, "Dockerfile");
    const dstZeroInit = join(ctxDir, "zeroinit");
    const zciNameInImage = "/usr/local/bin/zeroinit";

    // 3) Écrire Dockerfile wrapper
    const dockerfile = `
FROM ${baseImage}

# Copie le binaire zeroinit
COPY --chmod=0755 zeroinit ${zciNameInImage}

# Remplace l'ENTRYPOINT par zeroinit (l'app originale sera passée en CMD)
ENTRYPOINT ["${zciNameInImage}"]
CMD ${jsonArrayForDockerfile(finalCmd)}
`;

    try {
        await writeFile(dockerfilePath, dockerfile, "utf8");

        // 4) Copier le binaire zeroinit dans le contexte
        await cp(zeroinitHostPath, dstZeroInit);

        // 5) Build l'image wrappée
        await execa(
            "docker",
            ["buildx", "build", "--load", "-t", outputTag, ctxDir],
            { stdio: "inherit" }
        );

        return outputTag;

    } finally {
        // 6) Nettoyage du contexte temporaire
        await rm(ctxDir, { recursive: true, force: true });
    }
}
