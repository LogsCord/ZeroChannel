import { Request, Response } from "express";
import { validateAuth } from "../auth/jwt.js";
import { withEphemeralLxc } from "../utils/lxc-helpers.js";
import { createConnection, PacketType } from "../utils/connection.js";

function sh(): string {
    const connection = createConnection();

    withEphemeralLxc({
        image: "images:debian/12",
        profile: "zc-build",
        logger: connection.logger,
    }, async (lxc) => {
        const shell = lxc.shell();

        shell.process.onData((data) => connection.sendPacket(PacketType.Stdout, Buffer.from(data, "utf8")));
        connection.stream.on("data", (data) => shell.write(data));

        return new Promise((resolve) => {
            setTimeout(resolve, 30 * 60_000);
        });
    });

    return connection.uuid;
}

export default async function (req: Request, res: Response) {
    const session = validateAuth(req);
    if (!session)
        return void res.status(401).send("Unauthorized");

    const uuid = await sh();
    res.json({ uuid });
}
