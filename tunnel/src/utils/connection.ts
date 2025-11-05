import { randomUUID } from "node:crypto";
import { Duplex } from "node:stream";
import { WebSocket } from "ws";

export interface Logger {
    info(message: string): void;
    error(message: string): void;
    error(message: unknown): void;
}

export enum PacketType {
    Stdout = 1,
    Stderr = 2,
    Command = 99,
}

const TMP_HEADER = Buffer.allocUnsafe(1);

export class Connection {
    private _uuid: string;
    private _packets: Buffer[];
    private _connections: Set<WebSocket>;
    private _stream: Duplex;

    constructor(uuid: string = randomUUID()) {
        this._uuid = uuid;
        this._packets = [];
        this._connections = new Set();

        this._stream = new Duplex({
            // Côté lecture → les clients écrivent dedans (via push)
            read() {},

            // Côté écriture → le backend écrit dedans (broadcast vers clients)
            write: (packet, _enc, cb) => {
                try {
                    this._packets.push(packet);

                    for (const ws of this._connections)
                        if (ws.readyState === WebSocket.OPEN)
                            ws.send(packet);

                    cb();

                } catch (err) {
                    cb(err as Error);
                }
            },

            objectMode: true,
        });
    }

    add(ws: WebSocket) {
        this._connections.add(ws);

        ws.on("message", (message: WebSocket.RawData) => {
            // 👇 Ici on push dans la lecture du stream
            // (le backend "lit" ces données)
            if (Buffer.isBuffer(message)) {
                this._stream.push(message); // flux binaire vers stdin

            } else {
                try {
                    this._stream.push(JSON.parse(message.toString()));

                } catch {
                    this._stream.push(message.toString());
                }
            }
        });

        ws.on("close", () => this.remove(ws));

        for (const packet of this._packets)
            ws.send(packet);
    }

    remove(ws: WebSocket) {
        this._connections.delete(ws);
    }

    sendPacket(type: PacketType, data: Buffer) {
        TMP_HEADER.writeUInt8(type, 0);
        this._stream.write(Buffer.concat([TMP_HEADER, data]));
    }

    send(packet: Record<string, any>) {
        // 👇 envoyer un objet depuis backend vers clients
        this.sendPacket(PacketType.Command, Buffer.from(JSON.stringify(packet)));
    }

    get uuid() {
        return this._uuid;
    }

    get stream() {
        return this._stream;
    }

    get logger(): Logger {
        return {
            info: (message: string) => this.sendPacket(PacketType.Stdout, Buffer.from(message)),
            error: (message: string) => this.sendPacket(PacketType.Stderr, Buffer.from(message)),
        };
    }
}

const Connections = new Map<string, Connection>();

export function createConnection(): Connection {
    const connection = new Connection();

    Connections.set(connection.uuid, connection);

    return connection;
}

export function getConnection(uuid: string): Connection | undefined {
    return Connections.get(uuid);
}
