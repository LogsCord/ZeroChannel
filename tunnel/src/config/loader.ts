import fs from "fs";
import yaml from "js-yaml";
import { Config } from "./types.js";

const CONFIG_PATH = "./zerochannel.config.yaml";

export function loadConfig(): Config {
    return yaml.load(fs.readFileSync(CONFIG_PATH, "utf8")) as Config;
}

export const config = loadConfig();
