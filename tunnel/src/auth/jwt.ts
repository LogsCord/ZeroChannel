import jwt from "jsonwebtoken";
import { Request } from "express";

const JWT_SECRET = "supersecret"; // à sécuriser en prod

export interface Token {
    token: string;
    expires: string;
}

export interface AuthSession {
    username: string;
}

export function generateToken(username: string): Token {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "30d" });

    return {
        token,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
}

export function validateAuth(req: Request): AuthSession | null {
    const auth = req.headers["authorization"];

    if (!auth?.startsWith("Bearer "))
        return null;

    try {
        const payload = jwt.verify(auth.slice(7), JWT_SECRET);

        if (!payload || typeof payload !== "object")
            return null;

        if (typeof payload.username !== "string")
            return null;

        return payload as AuthSession;

    } catch (err) {
        console.error(err);
        return null;
    }
}
