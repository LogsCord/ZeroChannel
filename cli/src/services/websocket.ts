import { Duplex } from "stream";
import WebSocket from "ws";

export function createEventsDuplex(
    uuid: string,
    server: string,
    token: string
): Duplex & { get ready(): Promise<void> } {
    let ws: WebSocket | null = null;
    let destroyed = false;
    let connectPromiseResolve: (() => void) | null = null;
    let _readyPromise: Promise<void> | null = null;

    const duplex = new Duplex({
        objectMode: true,

        read() {
            // rien à faire, on push depuis ws.on("message")
        },

        write(packet, _, cb) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(packet);
                cb();

            } else {
                cb(new Error("WebSocket not connected"));
            }
        },

        destroy(_err, cb) {
            destroyed = true;
            ws?.close();
            cb();
        },
    }) as Duplex & { get ready(): Promise<void> };

    function connect() {
        if (destroyed)
            return;

        console.log(`${server.replace(/^http/, "ws")}/events/${uuid}`);

        ws = new WebSocket(`${server.replace(/^http/, "ws")}/events/${uuid}`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        ws.on("open", () => {
            duplex.emit("connect");
            connectPromiseResolve?.();
            _readyPromise = null; // Pour régénérer sur prochaine reconnexion
        });

        ws.on("message", (data) => {
            duplex.push(data);
        });

        ws.on("close", () => {
            if (destroyed) return;
            duplex.emit("reconnecting");
            setTimeout(connect, 1000);
        });

        ws.on("error", (err) => {
            duplex.emit("error", err);
            ws?.close();
        });
    }

    function ensureReadyPromise() {
        if (!_readyPromise) {
            _readyPromise = new Promise<void>((resolve) => {
                connectPromiseResolve = resolve;
            });
        }
        return _readyPromise;
    }

    Object.defineProperty(duplex, "ready", {
        get() {
            return ensureReadyPromise();
        },
    });

    connect();
    ensureReadyPromise();
    return duplex;
}
