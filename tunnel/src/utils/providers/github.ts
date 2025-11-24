import fetch from "node-fetch";

import {
    AbstractGitProvider,
    RepoExistsParams,
    CreateRepoParams,
    CreatedRepo
} from "./base.js";

export class GitHubProvider extends AbstractGitProvider {
    readonly name = "github";

    /**
     * Effectue un appel API GitHub authentifié.
     */
    private async request(method: string, url: string, token: string, body?: any) {
        const headers: any = {
            "Authorization": `Bearer ${token}`,
            "User-Agent": "ZeroInfra-Agent",
            "Accept": "application/vnd.github+json",
        };

        if (body)
            headers["Content-Type"] = "application/json";

        const res = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        return res;
    }

    /**
     * Vérifie si un repo existe.
     * Retourne true si trouvé, false si 404.
     * Lance une erreur pour toute autre erreur.
     */
    async repoExists(params: RepoExistsParams): Promise<boolean> {
        const { owner, name, token } = params;
        const url = `https://api.github.com/repos/${owner}/${name}`;
        const res = await this.request("GET", url, token);

        if (res.status === 404)
            return false;

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`GitHub repoExists error (${res.status}): ${body}`);
        }

        return true;
    }

    private async getURL(owner: string, token: string) {
        const orgCheck = await this.request("GET", `https://api.github.com/orgs/${owner}`, token);

        return orgCheck.ok
            ? `https://api.github.com/orgs/${owner}/repos`
            : `https://api.github.com/user/repos`;
    }

    /**
     * Crée un repository GitHub.
     *
     * - Si owner est une organisation → POST /orgs/{org}/repos
     * - Sinon → POST /user/repos (repo dans le namespace du user)
     */
    async createRepository(params: CreateRepoParams): Promise<CreatedRepo> {
        const { owner, name, private: isPrivate, description, token } = params;
        const url = await this.getURL(owner, token);

        const res = await this.request("POST", url, token, {
            name,
            private: isPrivate,
            description: description ?? "",
            auto_init: false,
        });

        if (!res.ok) {
            const body = await res.text();
            throw new Error(`GitHub createRepository error (${res.status}): ${body}`);
        }

        const repo = await res.json() as any;

        return {
            name: repo.name,
            fullName: repo.full_name,
            httpUrl: repo.clone_url,
            sshUrl: repo.ssh_url,
            cloneUrl: repo.clone_url,
        };
    }
}
