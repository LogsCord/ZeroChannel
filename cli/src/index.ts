#!/usr/bin/env node
import { Command } from "commander";
import { input } from "@inquirer/prompts";
import { NAME, DESCRIPTION, VERSION } from "./config/constants.js";
import { login } from "./commands/login.js";
import { start } from "./commands/start.js";
import { list } from "./commands/list.js";
import { config } from "./commands/config.js";
import { deploy } from "./commands/deploy.js";
import { sh } from "./commands/sh.js";
import { setSecret } from "./commands/secrets/set.js";
import { listSecrets } from "./commands/secrets/list.js";
import { deleteSecret } from "./commands/secrets/delete.js";

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

program
    .command("deploy")
    .description("Deploy an environment")
    .argument("[environment]", "Environment name")
    .option("--repo <repo>", "Repository URL")
    .option("--branch <branch>", "Branch name")
    .action(async (env, options) => {
        await deploy({
            env,
            repo: options.repo,
            branch: options.branch
        });
    });

program
    .command("sh")
    .description("Open a shell in an ephemeral container")
    .action(async () => {
        await sh();
    });

const secretsProgram = program
    .command("secrets")
    .description("Secrets management");

secretsProgram
    .command("set")
    .description("Set a secret")
    .argument("<name>", "Secret name")
    .option("--infra <infra>", "Infrastructure name")
    .option("--project <project>", "Project name")
    .action(async (name, options) => {
        await setSecret({
            name,
            infraName: options.infra,
            projectName: options.project,
        });
    });

secretsProgram
    .command("list")
    .description("List secrets")
    .option("--infra <infra>", "Infrastructure name")
    .option("--project <project>", "Project name")
    .action(async (options) => {
        await listSecrets({
            infraName: options.infra,
            projectName: options.project,
        });
    });

secretsProgram
    .command("delete")
    .description("Delete a secret")
    .argument("<name>", "Secret name")
    .option("--infra <infra>", "Infrastructure name")
    .option("--project <project>", "Project name")
    .action(async (name, options) => {
        await deleteSecret({
            name,
            infraName: options.infra,
            projectName: options.project,
        });
    });

program.parse();
