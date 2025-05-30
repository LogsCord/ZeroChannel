import axios from "axios";
import os from "os";
import { VERSION } from "../config/constants.js";

export async function sayHello(server: string): Promise<{ auth: string }> {
    const response = await axios.post(`${server}/api/hello`, {
        client: os.hostname(),
        version: VERSION
    });
    return response.data;
}

export async function authenticate(server: string, username: string, password: string): Promise<{ token: string }> {
    const response = await axios.post(`${server}/api/auth`, { username, password });
    return response.data;
}

export async function getTunnels(server: string, token: string): Promise<{ environments: Record<string, any> }> {
    const response = await axios.get(`${server}/api/tunnels`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
}
