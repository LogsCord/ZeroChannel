import os from "os";
import { Duplex } from "stream";
import axios from "axios";
import { VERSION } from "../config/constants.js";
import { createEventsDuplex } from "./websocket.js";
import { loadConfig } from "../config/loader.js";

export type DeployOptions = {
    envName: string;
    repoUrl: string;
    branch: string;
    gitUser: string;
    gitToken: string;
};

export type EventsResponse = {
    uuid: string;
    stream: Duplex & { get ready(): Promise<void> };
};

export class API {

    constructor(
        public server: string,
        public token: string
    ) {}

    public async getTunnels(): Promise<{ environments: Record<string, any> }> {
        const response = await axios.get(`${this.server}/api/tunnels`, {
            headers: { Authorization: `Bearer ${this.token}` }
        });

        return response.data;
    }

    public async deploy(
        options: DeployOptions
    ): Promise<EventsResponse> {
        const response = await axios.post(`${this.server}/api/deploy`, options, {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        return this.createEventsResponse(response.data.uuid);
    }

    public async sh(): Promise<EventsResponse> {
        const response = await axios.post(`${this.server}/api/sh`, {}, {
            headers: { Authorization: `Bearer ${this.token}` }
        });

        return this.createEventsResponse(response.data.uuid);
    }

    private createEventsResponse(uuid: string): EventsResponse {
        const stream = createEventsDuplex(uuid, this.server, this.token);

        return { uuid, stream };
    }

    public static async sayHello(server: string): Promise<{ auth: string }> {
        const response = await axios.post(`${server}/api/hello`, {
            client: os.hostname(),
            version: VERSION
        });

        return response.data;
    }

    public static async authenticate(
        server: string,
        username: string,
        password: string
    ): Promise<{ token: string }> {
        const response = await axios.post(`${server}/api/auth`, { username, password });

        return response.data;
    }
}

export function createAPI() {
    const config = loadConfig();
    return new API(config.server, config.token);
}