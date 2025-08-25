import net from "net";
import WebSocket from "ws";
import { Request } from "express";
import { config } from "../config/loader.js";
import { AuthSession } from "../auth/jwt.js";

export function getRequestedService(session: AuthSession, req: Request) {
    const username = session.username;
    const allowed = config.policies[username] || [];

    if (!allowed.includes(req.params["env"]))
        return null;

    const env = req.params["env"];
    const serviceName = req.params["service"];
    const service = config.environments[env]?.[serviceName];

    if (!service)
        return null;

    return service;
}

export function createTunnel(ws: WebSocket, host: string, port: number): void {
    const client = new net.Socket();

    client.connect(port, host, () => {
        client.on("data", chunk => ws.send(chunk));
        ws.on("message", data => client.write(data as Buffer));

        client.on("error", () => ws.close());
        client.on("close", () => ws.close());
        ws.on("close", () => client.destroy());
    });

    client.on("error", err => {
        console.error(`Erreur de connexion à ${host}:${port}:`, err.message);
        ws.close();
    });
}
