import os from "os";
import { Duplex } from "stream";
import axios from "axios";
import { createEventsDuplex } from "./websocket.js";
import { Config, loadConfig } from "../config/loader.js";
import { VERSION } from "../config/constants.js";
import { EncryptedSecret } from "../utils/encrypt.js";

export interface DeployOptions {
    envName: string;
    repoUrl: string;
    branch: string;
    gitUser: string;
    gitToken: string;
}

export interface EventsResponse {
    uuid: string;
    stream: Duplex & { get ready(): Promise<void> };
}

export interface CreateInfraOptions {
    name: string;
    template: "web"
}

export interface CreateInfraResult {
    id: string;
    name: string;
}

export interface SetSecretsOptions extends ListSecretsOptions {
    encryptedPayload: EncryptedSecret;
}

export interface SetSecretsResult {
    name: string;
}

export interface DeleteSecretsOptions extends ListSecretsOptions {
    name: string;
}

export interface DeleteSecretsResult {
    deleted: boolean;
}

export interface ListSecretsOptions {
    infraName?: string;
    projectName?: string;
}

export interface ListSecretsResult {
    secrets: { name: string }[];
}

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

    public async listSecrets(options: ListSecretsOptions): Promise<ListSecretsResult> {
        const response = await axios.get(`${this.server}/api/secrets`, {
            headers: { Authorization: `Bearer ${this.token}` },
            params: options
        });

        return response.data;
    }

    public async setSecret(options: SetSecretsOptions): Promise<SetSecretsResult> {
        console.log(options);
        const response = await axios.post(`${this.server}/api/secrets`, options, {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        return response.data;
    }

    public async deleteSecret(options: DeleteSecretsOptions): Promise<DeleteSecretsResult> {
        const response = await axios.delete(`${this.server}/api/secrets`, {
            headers: { Authorization: `Bearer ${this.token}` },
            params: options
        });

        return response.data;
    }

    public async createInfrastructure(options: CreateInfraOptions): Promise<CreateInfraResult> {
        const response = await axios.post(`${this.server}/api/infra`, options, {
            headers: { Authorization: `Bearer ${this.token}` },
        });

        return response.data;
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

export function createAPI(config?: Config) {
    config ||= loadConfig();
    return new API(config.server, config.token);
}
