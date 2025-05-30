import chalk from 'chalk';
import { loadConfig } from "../config/loader.js";
import { getTunnels } from "../services/api.js";
import { getFreePort, createTunnelServer } from "../utils/port.js";
import { resolveLocalPort } from "../config/loader.js";
import { displayError } from "../utils/error.js";

export async function start(env: string): Promise<void> {
    try {
        const config = loadConfig();
        const domain = new URL(config.server).hostname;

        const { environments } = await getTunnels(config.server, config.token);
        const services = environments[env];
        
        if (!services) {
            throw new Error(`Environment "${env}" not found or not accessible.`);
        }

        // Vérifier si des ports sont configurés
        let hasConfiguredPorts = false;
        for (const name of Object.keys(services)) {
            if (resolveLocalPort(domain, env, name)) {
                hasConfiguredPorts = true;
                break;
            }
        }

        if (!hasConfiguredPorts) {
            console.log(chalk.yellow('\n💡 Pour configurer manuellement les ports, utilisez la commande:'));
            console.log(chalk.white(`zerochannel config ${env}\n`));
        }

        console.log(chalk.cyan('Services disponibles:'));
        for (const [name, svc] of Object.entries(services)) {
            try {
                const localPort = resolveLocalPort(domain, env, name) || getFreePort();
                const urlTunnel = `${config.server.replace("http", "ws")}/tunnel/${env}/${name}`;

                console.log(chalk.green(`> ${name}: localhost:${localPort}`));

                createTunnelServer({
                    url: urlTunnel,
                    token: config.token,
                    localPort
                });
            } catch (error) {
                displayError(error);
            }
        }

    } catch (error) {
        displayError(error);
    }
}
