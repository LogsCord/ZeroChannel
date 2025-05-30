import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import yaml from "js-yaml";
import { CONFIG } from "./constants.js";

export interface Config {
    server: string;
    token: string;
}

export interface ServiceConfig {
    port: number;
}

export interface EnvConfig {
    [serviceName: string]: ServiceConfig;
}

export function loadConfig(): Config {
    if (!existsSync(CONFIG.FILE)) {
        throw new Error("Please login first.");
    }
    return yaml.load(readFileSync(CONFIG.FILE, "utf-8")) as Config;
}

export function saveConfig(config: Config): void {
    mkdirSync(CONFIG.DIR, { recursive: true });
    writeFileSync(CONFIG.FILE, yaml.dump(config));
}

export function getConfigPath(origin: string, env: string): string {
    return `${CONFIG.DIR}/${origin}/${env}.yml`;
}

export function loadEnvConfig(origin: string, env: string): EnvConfig | undefined {
    const configFile = getConfigPath(origin, env);
    if (!existsSync(configFile)) return undefined;

    try {
        const config = yaml.load(readFileSync(configFile, "utf8")) as EnvConfig;
        return config;
    } catch (err) {
        return undefined;
    }
}

export function resolveLocalPort(origin: string, env: string, serviceName: string): number | undefined {
    const config = loadEnvConfig(origin, env);
    return config?.[serviceName]?.port;
}
