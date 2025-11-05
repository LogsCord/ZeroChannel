import WebSocket from "ws";
import { Duplex } from "node:stream";

function sendResize(stream: Duplex) {
    const cols = process.stdout.columns;
    const rows = process.stdout.rows;

    // stream.write({
    //     fd: 99, // packet "commande"
    //     type: "resize",
    //     cols,
    //     rows
    // });
}

export function setupConsole(stream: Duplex) {
    stream.on("data", onReceivePacket);

    // Ecoute du redimensionnement
    process.stdout.on("resize", () => sendResize(stream));
    sendResize(stream);

    // Configuration du terminal
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (chunk) => {
        if (chunk[0] === 3) {
            console.log("Ctrl+C détecté (SIGINT local)");
            // Exemple : envoyer un signal vers le shell distant
            // stream.send({ fd: 99, command: "SIGINT" });
            process.exit(0);
            return;
        }

        // Sinon, écrire normalement dans le terminal distant
        stream.write(chunk);
    });
}

function onReceivePacket(rawData: WebSocket.RawData) {
    const buffer = rawData as Buffer;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    const fd = view.getUint8(0); // premier octet = ID
    const payload = buffer.subarray(1); // reste du message

    switch (fd) {
        case 1: // stdout
            process.stdout.write(payload);
            break;

        case 2: // stderr
            process.stderr.write(payload);
            break;

        case 99: // command
            try {
                const json = JSON.parse(payload.toString("utf-8"));
                console.log("🧠 Command packet:", json);
            } catch {
                console.warn("Invalid command packet");
            }
            break;

        default:
            console.warn("Unknown packet type:", fd);
    }
}
