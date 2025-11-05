import { Request, Response } from "express";
import { validateAuth } from "../auth/jwt.js";
import { withEphemeralLxc } from "../utils/lxc-helpers.js";
import { createConnection, PacketType } from "../utils/connection.js";

function sh(): Promise<string> {
    return new Promise((resolve) => {
        withEphemeralLxc({
            image: "images:debian/12",
            profile: "zc-build"
        }, async (lxc) => {
            const connection = createConnection();
            const { process, write } = lxc.shell();

            connection.stream.on("data", (data) => write(data));
            process.onData((data) => connection.sendPacket(PacketType.Stdout, Buffer.from(data, "utf8")));
            resolve(connection.uuid);

            return new Promise((resolve) => {
                setTimeout(resolve, 30 * 60_000);
            });
        });
    });
}

export default async function (req: Request, res: Response) {
    const session = validateAuth(req);
    if (!session)
        return void res.status(401).send("Unauthorized");

    const uuid = await sh();
    res.json({ uuid });
}
