export interface Environment {
    [serviceName: string]: { host: string; port: number };
}

export interface User {
    password: string;
}

export interface Config {
    auth: {
        method: "simple";
        users: Record<string, User>;
    };
    policies: Record<string, string[]>;
    environments: Record<string, Environment>;
}
