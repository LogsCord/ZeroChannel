import { Router } from "express";
import { validateAuth } from "../auth/jwt.js";
import { getRequestedService, createTunnel } from "../services/tunnel.js";
import { tinyWs } from "proxy-agent";

const router = Router();

tinyWs({ router: router as any });

router.ws("/:env/:service", (ws, req) => {
    const session = validateAuth(req);
    if (!session)
        return ws.close();

    const service = getRequestedService(session, req);
    if (!service)
        return ws.close();

    createTunnel(ws, service.host, service.port);
});

export default router;
