// 📁 zerochannel-backend-v1/index.ts
import express from "express";
import { tinyWs } from "proxy-agent";
import apiRoutes from "./routes/api.js";
import tunnelRoutes from "./routes/tunnel.js";
import { validateAuth } from "./auth/jwt.js";
import { getConnection } from "./utils/connection.js";

const app = express();

// Middleware
app.use(express.json());
tinyWs({ app: app as any });

// Routes
app.use("/api", apiRoutes);
app.use("/tunnel", tunnelRoutes);

// Events
app.ws("/events/:uuid", (ws, req) => {
    const session = validateAuth(req);
    if (!session)
        return ws.close();

    const connection = getConnection(req.params.uuid);
    if (!connection)
        return ws.close();

    connection.add(ws);
});

// Serve npm redirect on base path
app.get("/", (_req, res) => {
    res.redirect("https://www.npmjs.com/package/@zerochannel/cli");
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});
