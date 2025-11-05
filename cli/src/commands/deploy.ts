import fs from "fs";
import YAML from "yaml";
import { promisify } from "util";
import { input, password, confirm } from "@inquirer/prompts";
import { createAPI, DeployOptions } from "../services/api.js";
import { displayError } from "../utils/error.js";
import { setupConsole } from "../utils/console.js";

type CmdDeployOptions = {
    env?: string;
    repo?: string;
    branch?: string;
};

const readFile = promisify(fs.readFile);

async function useDeployConfig(deployOptions: DeployOptions) {
    const deployConfigContent = await readFile("./deploy.yml", "utf8").catch(() => null);

    if (deployConfigContent) {
        const deployConfig = YAML.parse(deployConfigContent);

        if (await confirm({ message: "Use deploy.yml configuration?" })) {
            if (deployConfig.envName)
                deployOptions.envName = deployConfig.envName;

            if (deployConfig.repoUrl)
                deployOptions.repoUrl = deployConfig.repoUrl;

            if (deployConfig.branch)
                deployOptions.branch = deployConfig.branch;

            if (deployConfig.git?.user)
                deployOptions.gitUser = deployConfig.git.user;

            if (deployConfig.git?.token)
                deployOptions.gitToken = deployConfig.git.token;
        }
    }
}

async function ensureDeployOptions(deployOptions: DeployOptions) {
    if (!deployOptions.envName)
        deployOptions.envName = await input({ message: "Environment name:" });

    if (!deployOptions.repoUrl)
        deployOptions.repoUrl = await input({ message: "Repository URL (https):" });

    if (!deployOptions.branch)
        deployOptions.branch = await input({ message: "Branch name:" });

    if (!deployOptions.gitUser)
        deployOptions.gitUser = await input({ message: "GitHub username:" });

    if (!deployOptions.gitToken)
        deployOptions.gitToken = await password({ message: "Git token (read-only):" });
}

export async function deploy(options: CmdDeployOptions) {
    try {
        const API = createAPI();

        const deployOptions: DeployOptions = {
            envName: options.env || "",
            repoUrl: options.repo || "",
            branch: options.branch || "",
            gitUser: "",
            gitToken: "",
        };

        await useDeployConfig(deployOptions);
        await ensureDeployOptions(deployOptions);

        const { stream } = await API.deploy(deployOptions);

        setupConsole(stream);

    } catch (error) {
        displayError(error);
    }
}
