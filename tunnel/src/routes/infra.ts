import express, { Router } from "express";
import { validateAuth } from "../auth/jwt.js";
import path from "node:path";

const router = Router();

const Templates = [
    {
        name: "web",
        description: "Web full-stack template (API + Vue frontend)",
        templateRoot: path.resolve("templates", "web"),
        repositories: [
            {
                id: "api",
                description: "Backend API (Node.js + Express)",
            },
            {
                id: "app",
                description: "Frontend app (Vue 3)",
            },
        ],
    },
];

router.post("/", express.json(), async (req, res) => {
    const session = validateAuth(req);
    if (!session)
        return void res.status(401).send("Unauthorized");

    const { name, template } = req.body;
    const isValid = (typeof name !== "string")
        || (typeof template !== "string");

    if (isValid)
        return void res.status(400).send("Missing parameters");
});

export default router;
