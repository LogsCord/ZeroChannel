import pty from "node-pty";
import { randomUUID } from "node:crypto";
import { execa, Options, ResultPromise } from "execa";
import type {Readable, Writable} from 'node:stream';

export type LxcExecOpts = {
    env?: Record<string, string>;
    cwd?: string;
    timeoutMs?: number;
};

type LxcShell = {
    process: pty.IPty;
    write: (data: string) => void;
};

export type LxcContext = {
    name: string;
    exec(cmd: string, opts?: LxcExecOpts): Promise<void>;
    push(src: string, destInContainer: string): Promise<void>;
    pull(srcInContainer: string, dest: string): Promise<void>;
    shell(): LxcShell;
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
        async exec(cmd, opts) { await lxcExecRaw(name, cmd, opts); },
        async push(src, dest) { await sh("lxc", ["file", "push", src, `${name}/${dest}`]); },
        async pull(src, dest) { await sh("lxc", ["file", "pull", `${name}/${src}`, dest]); },
        shell() {
            // ✅ execa renvoie déjà un process avec ses streams
            const childProcess = pty.spawn("lxc", ["shell", name], {
                env: process.env,
                cwd: "/usr/bin",
                cols: 80,
                rows: 24,
            });

            childProcess.onExit((data) => console.log("exit", data));

            return {
                process: childProcess,
                write(data: string) {
                    childProcess.write(data);
                },
            };
        },
    };
}

/**
 * Lance un conteneur LXD éphémère, exécute fn(ctx), puis stop + delete (toujours).
 * - image: ex. "images:debian/12"
 * - profile: ex. "zc-build"
 */
export async function withEphemeralLxc<T>(options: LxcOptions, fn: (ctx: LxcContext) => Promise<T>): Promise<T> {
    const ctx = await createLxc({ ...options, ephemeral: true });

    async function cleanup() {
        try { await sh("lxc", ["stop", ctx.name]); } catch { }
        try { await sh("lxc", ["delete", ctx.name, "--force"]); } catch { }
    }

    // Cleanup sur Ctrl-C / process exit
    async function onSig() {
        await cleanup();
        process.exit(1);
    }

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
