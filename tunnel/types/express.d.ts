import { SymbolTinyWs } from "proxy-agent";
import WebSocket from "ws";
import { Request } from "express";

type TinyWsMiddleware = (ws: WebSocket, req: Request) => void;

declare module "@types/express-serve-static-core" {
    interface IRouter {
        ws(path: string, middleware: TinyWsMiddleware): void;
    }
}

declare module "express" {
    interface Request {
        [SymbolTinyWs]?: () => Promise<WebSocket>;
    }
}

declare module "http" {
    interface IncomingMessage {
        [SymbolTinyWs]?: () => Promise<WebSocket>;
    }
}