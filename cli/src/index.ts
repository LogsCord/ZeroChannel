import { Command } from "commander";
import { input } from "@inquirer/prompts";
import { NAME, DESCRIPTION, VERSION } from "./config/constants.js";
import { login } from "./commands/login.js";
import { start } from "./commands/start.js";
import { list } from "./commands/list.js";
import { config } from "./commands/config.js";

const program = new Command();

program
    .name(NAME)
    .description(DESCRIPTION)
    .version(VERSION);

program
    .command("login")
    .description("Authenticate with ZeroChannel server")
    .option("--server <server>", "ZeroChannel control server URL")
    .action(async (options) => {
        const server = options.server || await input({ message: "Server URL:" });
        await login(server);
    });

program
    .command("start")
    .description("Start tunnel for an environment")
    .argument("<environment>", "Environment name")
    .action(async (env) => {
        await start(env);
    });

program
    .command("config")
    .description("Configure local ports for an environment")
    .argument("<environment>", "Environment name")
    .action(async (env) => {
        await config(env);
    });

program
    .command("list")
    .description("List available environments and services")
    .action(async () => {
        await list();
    });

program.parse();
