import pty from "node-pty";
import { randomUUID } from "node:crypto";
import { execa, Options } from "execa";
import { SignalConstants } from "node:os";
import { Logger } from "./connection.js";

export type LxcCreateOptions = {
    image?: string;
    profile?: string;
    name?: string;
    logger: Logger;
};

export type LxcExecOpts = {
    env?: Record<string, string>;
    cwd?: string;
    timeoutMs?: number;
};

export class LxcShell {
    constructor(public process: pty.IPty) {}

    write(data: string) {
        this.process.write(data);
    }
}

export class LxcContainer {
    constructor(
        public executor: LoggerExecutor,
        public name: string
    ) {}

    async exec(cmd: string, opts?: LxcExecOpts) {
        await this.executor.lxcExecRaw(this.name, cmd, opts);
    }

    async push(src: string, dest: string) {
        await this.executor.spawn("lxc", ["file", "push", src, `${this.name}/${dest}`]);
    }

    async pull(src: string, dest: string) {
        await this.executor.spawn("lxc", ["file", "pull", `${this.name}/${src}`, dest]);
    }

    shell(): LxcShell {
        // ✅ execa renvoie déjà un process avec ses streams
        const childProcess = pty.spawn("lxc", ["shell", this.name], {
            env: process.env,
            cwd: "/usr/bin",
            cols: 80,
            rows: 24,
        });

        childProcess.onExit((data) => console.log("exit", data));
        return new LxcShell(childProcess);
    }
};

function sh(cmd: string, args: string[], opts: Options = {}) {
    const process = execa(cmd, args, {
        ...opts,
        stdin   : "pipe",
        stdout  : "pipe",
        stderr  : "pipe",
    });

    process.stdin.end();

    return {
        stdin   : process.stdin,
        stdout  : process.stdout,
        stderr  : process.stderr,
        kill(signal?: keyof SignalConstants | number, error?: Error) {
            process.kill(signal, error);
        },
        then(...args: Parameters<typeof process.then>) {
            return process.then(...args);
        },
        catch(...args: Parameters<typeof process.catch>) {
            return process.catch(...args);
        },
    };
}

class LoggerExecutor {
    constructor(public logger: Logger) {}

    async spawn(cmd: string, args: string[], opts: Options = {}) {
        const execution = sh(cmd, args, opts);

        execution.stdout.on("data", (data) => this.logger.info(data.toString()));
        execution.stderr.on("data", (data) => this.logger.error(data.toString()));
        return await execution;
    }

    async lxcExecRaw(name: string, script: string, opts?: LxcExecOpts) {
        const envPairs = opts?.env
            ? Object.entries(opts.env).map(([k, v]) => `${k}='${v.replace(/'/g, `'\\''`)}'`).join(" ")
            : "";

        const cwd = opts?.cwd ? `cd '${opts.cwd.replace(/'/g, `'\\''`)}' && ` : "";
        const bash = `${envPairs ? `export ${envPairs}; ` : ""}${cwd}${script}`;

        return await this.spawn("lxc", ["exec", name, "--", "bash", "-lc", bash], {
            forceKillAfterDelay: 5000,
            timeout: opts?.timeoutMs || 0,
        });
    }

    async createLxc(options: LxcCreateOptions & { ephemeral?: boolean }) {
        const image = options.image || "images:debian/12";
        const profile = options.profile || "zc-build";
        const name = options.name || `zc-${randomUUID().slice(0, 8)}`;

        // Création profil réseau/limites en amont si besoin
        await this.spawn("lxc", [
            "launch", image, name,
            "-p", profile,
            ...(options.ephemeral ? ["--ephemeral"] : [])
        ]);

        return new LxcContainer(this, name);
    }
}

/**
 * Lance un conteneur LXD éphémère, exécute fn(ctx), puis stop + delete (toujours).
 * - image: ex. "images:debian/12"
 * - profile: ex. "zc-build"
 */
export async function withEphemeralLxc<T>(options: LxcCreateOptions, fn: (ctx: LxcContainer) => Promise<T>): Promise<T> {
    const executor = new LoggerExecutor(options.logger);
    const ctx = await executor.createLxc({ ...options, ephemeral: true });

    async function cleanup() {
        try { await executor.spawn("lxc", ["stop", ctx.name]); } catch { }
        try { await executor.spawn("lxc", ["delete", ctx.name, "--force"]); } catch { }
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
