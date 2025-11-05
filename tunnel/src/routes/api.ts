import { Router } from "express";
import crypto from "crypto";
import { config } from "../config/loader.js";
import { Environment } from "../config/types.js";
import { generateToken, validateAuth } from "../auth/jwt.js";
import deployRoutes from "./deploy.js";
import routeSh from "./sh.js";

const router = Router();

// POST /api/hello
router.post("/hello", (_req, res) => {
    res.json({ auth: "simple" });
});

// POST /api/auth
router.post("/auth", (req, res) => {
    const { username, password } = req.body;
    const user = config.auth.users[username];

    if (!user)
        return void res.status(403).json({ error: "Invalid credentials" });

    const hash = crypto
        .createHash("sha256")
        .update(password)
        .digest("hex");

    if (hash !== user.password)
        return void res.status(403).json({ error: "Invalid credentials" });

    const { token, expires } = generateToken(username);
    res.json({ token, expires });
});

// GET /api/tunnels
router.get("/tunnels", (req, res) => {
    const session = validateAuth(req);

    if (!session)
        return void res.status(401).json({ error: "Invalid token" });

    const username = session.username;
    const allowed = config.policies[username] || [];
    const result: Record<string, Environment> = {};

    for (const env of allowed)
        if (config.environments[env])
            result[env] = config.environments[env];

    res.json({ user: username, environments: result });
});

router.use("/deploy", deployRoutes);
router.post("/sh", routeSh);

export default router;
