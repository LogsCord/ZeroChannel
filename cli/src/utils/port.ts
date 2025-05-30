import WebSocket from "ws";
import net from "net";
import chalk from "chalk";

export function getFreePort(): number {
    return Math.floor((Math.random() * 1000) + 4000);
}

interface TunnelConfig {
    url: string;
    token: string;
    localPort: number;
}

export function createTunnelServer(config: TunnelConfig): void {
    const serverSocket = net.createServer((socket) => {
        // Créer une nouvelle connexion WebSocket pour chaque connexion cliente
        const ws = new WebSocket(config.url, {
            headers: { Authorization: `Bearer ${config.token}` }
        });

        // Gérer les erreurs WebSocket
        ws.on('error', (error) => {
            console.error(chalk.red(`❌ Erreur de connexion au tunnel: ${error.message}`));
            socket.destroy();
        });

        // Attendre que la connexion WebSocket soit établie
        ws.on('open', () => {
            // Transférer les données du socket local vers le WebSocket
            socket.on("data", (chunk) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(chunk);
                }
            });

            // Transférer les données du WebSocket vers le socket local
            ws.on("message", (data) => socket.write(data as Buffer));

            // Fermer proprement les connexions
            socket.on("close", () => ws.close());
            ws.on("close", () => socket.destroy());
        });
    });

    serverSocket.listen(config.localPort, () => {
        console.log(chalk.green(`✅ Tunnel prêt sur le port ${config.localPort}`));
    });

    serverSocket.on('error', (error) => {
        console.error(chalk.red(`❌ Erreur du serveur local: ${error.message}`));
    });
}
