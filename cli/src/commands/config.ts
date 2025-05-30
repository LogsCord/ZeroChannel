import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { loadConfig } from "../config/loader.js";
import { getTunnels } from "../services/api.js";
import { displayError } from "../utils/error.js";
import os from 'os';

import { EnvConfig } from "../config/loader.js";

export async function config(env: string): Promise<void> {
    try {
        const config = loadConfig();
        const domain = new URL(config.server).hostname;
        const { environments } = await getTunnels(config.server, config.token);
        const services = environments[env];

        if (!services) {
            throw new Error(`Environment "${env}" not found or not accessible.`);
        }

        // Créer le dossier de configuration s'il n'existe pas
        const configDir = path.dirname(path.join(os.homedir(), '.zerochannel', domain, `${env}.yml`));
        fs.mkdirSync(configDir, { recursive: true });

        const configPath = path.join(configDir, `${env}.yml`);
        let existingConfig: EnvConfig = {};

        // Charger la configuration existante si elle existe
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            existingConfig = yaml.load(content) as EnvConfig;
        }

        // Générer la nouvelle configuration
        let nextPort = 4000;
        const newConfig: EnvConfig = {};

        for (const [serviceName] of Object.entries(services)) {
            // Utiliser le port existant s'il existe, sinon incrémenter nextPort
            const existingPort = existingConfig[serviceName]?.port;
            newConfig[serviceName] = {
                port: existingPort || nextPort
            };
            nextPort++;
        }

        // Sauvegarder la configuration
        fs.writeFileSync(configPath, yaml.dump(newConfig));

        console.log(chalk.green('✅ Configuration créée avec succès !'));
        console.log(chalk.yellow('\n💡 Fichier de configuration:'), configPath);
        console.log(chalk.yellow('📝 Vous pouvez maintenant modifier les ports dans ce fichier.\n'));
        
        // Afficher la configuration actuelle
        console.log(chalk.cyan('Configuration actuelle:'));
        for (const [service, config] of Object.entries(newConfig)) {
            console.log(chalk.green(`> ${service}: localhost:${config.port}`));
        }

    } catch (error) {
        displayError(error);
    }
}
