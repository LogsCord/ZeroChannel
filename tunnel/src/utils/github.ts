// github-dockerfile-introspection.ts
// Node 18+ (fetch global). Si vous êtes sous Node <18, installez "node-fetch" et importez-le.

type Repo = {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    archived: boolean;
    disabled: boolean;
    fork: boolean;
    owner: { login: string };
};

type Branch = {
    name: string;
    commit: { sha: string; url: string };
    protected: boolean;
};

type DockerfileCheck = {
    repo: string;           // "owner/repo"
    branch: string;         // branch name
    hasDockerfileRoot: boolean;
    httpStatus: number;     // 200 => found, 404 => not found, other => error
    error?: string;
};

type RepoBranchesResult = {
    repo: string;
    branches: Branch[];
};

type CompatibleEntry = {
    repo: string;        // "owner/repo"
    branch: string;
};

type GitHubIntrospectorOptions = {
    token: string;
    org?: string;
    user?: string;
};

const GITHUB_API = "https://api.github.com";

function parseLinkHeader(link?: string | null): Record<string, string> {
    // Parse RFC 5988 Link header for pagination
    const links: Record<string, string> = {};
    if (!link) return links;
    link.split(",").forEach((part) => {
        const section = part.split(";");
        if (section.length !== 2) return;
        const url = section[0].trim().replace(/^<|>$/g, "");
        const name = section[1].trim().replace(/^rel="|"$/g, "").replace(/^rel=/, "").replace(/"/g, "");
        links[name] = url;
    });
    return links;
}

export class GitHubIntrospector {
    constructor(private options: GitHubIntrospectorOptions) {
        if (!options.token) throw new Error("Missing GitHub PAT.");
    }

    // ---------- Public API ----------

    /** Liste tous les repos accessibles par le PAT (owner, collaborator, org_member). */
    async listAllRepos(perPage = 100): Promise<Repo[]> {
        if (!this.options.org && !this.options.user) throw new Error("Missing org or user.");

        const base = this.options.org
            ? `${GITHUB_API}/orgs/${this.options.org}/repos?per_page=${perPage}&affiliation=collaborator,organization_member&sort=full_name`
            : `${GITHUB_API}/users/${this.options.user}/repos?per_page=${perPage}&affiliation=owner,organization_member&sort=full_name`;

        const out: Repo[] = [];

        for await (const page of this.paginate<Repo>(base))
            out.push(...page);

        return out;
    }

    /** Liste les branches d’un repo (owner/repo). */
    async listBranches(owner: string, repo: string, perPage = 100): Promise<Branch[]> {
        const base = `${GITHUB_API}/repos/${owner}/${repo}/branches?per_page=${perPage}`;
        const out: Branch[] = [];
        for await (const page of this.paginate<Branch>(base)) {
            out.push(...page);
        }
        return out;
    }

    /** Teste la présence d’un Dockerfile à la racine pour une branche donnée. */
    async hasDockerfileAtRoot(owner: string, repo: string, branch: string): Promise<DockerfileCheck> {
        const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/Dockerfile?ref=${encodeURIComponent(branch)}`;
        const res = await this.get(url);
        if (res.status === 200) {
            return { repo: `${owner}/${repo}`, branch, hasDockerfileRoot: true, httpStatus: 200 };
        }
        if (res.status === 404) {
            return { repo: `${owner}/${repo}`, branch, hasDockerfileRoot: false, httpStatus: 404 };
        }
        const text = await res.text();
        return {
            repo: `${owner}/${repo}`,
            branch,
            hasDockerfileRoot: false,
            httpStatus: res.status,
            error: text,
        };
        // Note : si vous souhaitez chercher d’autres emplacements (ex: /docker/Dockerfile),
        // ajoutez des checks supplémentaires ici.
    }

    // ---------- Convenience higher-level functions ----------

    /** Pour chaque repo, liste ses branches. */
    async listReposWithBranches(): Promise<RepoBranchesResult[]> {
        const repos = await this.listAllRepos();
        const results: RepoBranchesResult[] = [];

        // Concurrency limiter (simple) pour éviter de frapper trop fort l'API
        const concurrency = 8;
        const queue = [...repos];
        const workers: Promise<void>[] = [];
        const take = () => queue.shift();

        for (let i = 0; i < concurrency; i++) {
            workers.push(
                (async () => {
                    let item: Repo | undefined;
                    while ((item = take())) {
                        try {
                            const branches = await this.listBranches(item.owner.login, item.name);
                            results.push({ repo: item.full_name, branches });
                        } catch (e) {
                            // Vous pouvez logger ou stocker les erreurs de branches ici si besoin
                            results.push({ repo: item.full_name, branches: [] });
                        }
                    }
                })()
            );
        }
        await Promise.all(workers);
        return results;
    }

    /** Retourne toutes les paires {repo, branch} où un Dockerfile existe à la racine. */
    async findCompatibleRepoBranches(): Promise<{
        compatibles: CompatibleEntry[];
        checks: DockerfileCheck[]; // détail complet si vous voulez diagnostiquer
    }> {
        const reposWithBranches = await this.listReposWithBranches();
        const checks: DockerfileCheck[] = [];

        // Concurrency sur les checks (branches potentiellement nombreuses)
        const tasks: Array<() => Promise<void>> = [];
        for (const rb of reposWithBranches) {
            const [owner, repo] = rb.repo.split("/");
            for (const br of rb.branches) {
                tasks.push(async () => {
                    const check = await this.hasDockerfileAtRoot(owner, repo, br.name);
                    checks.push(check);
                });
            }
        }

        const concurrency = 16;
        let idx = 0;
        const workers: Promise<void>[] = [];
        const runNext = async () => {
            const i = idx++;
            if (i >= tasks.length) return;
            await tasks[i]();
            return runNext();
        };
        for (let i = 0; i < concurrency; i++) workers.push(runNext());
        await Promise.all(workers);

        const compatibles: CompatibleEntry[] = checks
            .filter((c) => c.hasDockerfileRoot)
            .map((c) => ({ repo: c.repo, branch: c.branch }));

        return { compatibles, checks };
    }

    // ---------- Low-level HTTP helpers ----------

    private headers(extra?: Record<string, string>) {
        return {
            Authorization: `Bearer ${this.token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "ZeroChannel-Introspector",
            ...extra,
        };
    }

    private get<T>(url: string): Promise<Response> {
        return fetch(url, { headers: this.headers() });
    }

    private async *paginate<T>(initialUrl: string): AsyncGenerator<T[], void, unknown> {
        let url: string | undefined = initialUrl;
        while (url) {
            const res = await this.get<T[]>(url);
            if (res.status === 401) throw new Error("Unauthorized (401): invalid or insufficient token.");
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`GitHub API error ${res.status}: ${text}`);
            }
            const data = (await res.json()) as T[];
            yield data;
            const links = parseLinkHeader(res.headers.get("Link"));
            url = links["next"];
        }
    }

    private get token() {
        return this.options.token;
    }

    private get org() {
        return this.options.org;
    }

    private get user() {
        return this.options.user;
    }
}

// ------------------------
// Exemple d’utilisation :
// ------------------------
(async () => {
    const token = process.env.GITHUB_TOKEN || "github_pat_dummy";
    const gh = new GitHubIntrospector({
        token,
        org: "AnimeoTV"
    });

    // 1) Lister tous les repos
    const repos = await gh.listAllRepos();
    console.log("Repos accessibles:", repos.map(r => r.full_name));

    // 2) Lister branches pour chaque repo
    const reposWithBranches = await gh.listReposWithBranches();
    console.log("Branches par repo:", reposWithBranches); // apperçu

    // 3) Chercher les {repo, branch} avec Dockerfile à la racine
    const { compatibles, checks } = await gh.findCompatibleRepoBranches();
    console.log("Compatibles (Dockerfile @ /):", compatibles);

    // Optionnel : inspecter les erreurs HTTP éventuelles
    const errors = checks.filter(c => !c.hasDockerfileRoot && c.httpStatus !== 404);
    if (errors.length) console.warn("Erreurs API:", errors.slice(0, 3));
})();
