import { execa, Options } from "execa";
import { randomUUID } from "node:crypto";

export type LxcExecOpts = {
    env?: Record<string, string>;
    cwd?: string;
    timeoutMs?: number;
};

export type LxcContext = {
    name: string;
    exec: (cmd: string, opts?: LxcExecOpts) => Promise<void>;
    push: (src: string, destInContainer: string) => Promise<void>;
    pull: (srcInContainer: string, dest: string) => Promise<void>;
};

type LxcOptions = {
    image?: string;
    profile?: string;
    name?: string;
};

async function sh(cmd: string, args: string[], opts: Options = {}) {
    return execa(cmd, args, { stdio: "inherit", ...opts });
}

async function lxcExecRaw(name: string, script: string, opts?: LxcExecOpts) {
    const envPairs = opts?.env
        ? Object.entries(opts.env).map(([k, v]) => `${k}='${v.replace(/'/g, `'\\''`)}'`).join(" ")
        : "";

    const cwd = opts?.cwd ? `cd '${opts.cwd.replace(/'/g, `'\\''`)}' && ` : "";
    const bash = `${envPairs ? `export ${envPairs}; ` : ""}${cwd}${script}`;
    const p = await sh("lxc", ["exec", name, "--", "bash", "-lc", bash], {
        forceKillAfterDelay: 5000,
        timeout: opts?.timeoutMs || 0,
    });

    return p;
}

export async function createLxc(options: LxcOptions & { ephemeral?: boolean }) {
    const image = options.image || "images:debian/12";
    const profile = options.profile || "zc-build";
    const name = options.name || `zc-${randomUUID().slice(0, 8)}`;

    // Création profil réseau/limites en amont si besoin
    await sh("lxc", [
        "launch", image, name,
        "-p", profile,
        ...(options.ephemeral ? ["--ephemeral"] : [])
    ]);

    return <LxcContext>{
        name,
        exec: async (cmd, opts) => { await lxcExecRaw(name, cmd, opts); },
        push: async (src, dest) => { await sh("lxc", ["file", "push", src, `${name}/${dest}`]); },
        pull: async (src, dest) => { await sh("lxc", ["file", "pull", `${name}/${src}`, dest]); },
    };
}

/**
 * Lance un conteneur LXD éphémère, exécute fn(ctx), puis stop + delete (toujours).
 * - image: ex. "images:debian/12"
 * - profile: ex. "zc-build"
 */
export async function withEphemeralLxc<T>(options: LxcOptions, fn: (ctx: LxcContext) => Promise<T>): Promise<T> {
    const ctx = await createLxc({ ...options, ephemeral: true });

    const cleanup = async () => {
        try { await sh("lxc", ["stop", ctx.name]); } catch { }
        try { await sh("lxc", ["delete", ctx.name, "--force"]); } catch { }
    };

    // Cleanup sur Ctrl-C / process exit
    const onSig = async () => {
        await cleanup();
        process.exit(1);
    };

    process.on("SIGINT", onSig);
    process.on("SIGTERM", onSig);
    process.on("SIGHUP", onSig);

    try {
        return await fn(ctx);

    } finally {
        process.off("SIGINT", onSig);
        process.off("SIGTERM", onSig);
        process.off("SIGHUP", onSig);
        await cleanup();
    }
}
