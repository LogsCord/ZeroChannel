export interface RepoExistsParams {
    owner: string;          // user ou org
    name: string;           // nom du repo
    token: string;          // token d'accès
}

export interface CreateRepoParams {
    owner: string;
    name: string;
    private: boolean;
    description?: string;
    token: string;
}

export interface CreatedRepo {
    name: string;
    fullName: string;
    httpUrl: string;
    sshUrl?: string;
    cloneUrl: string; // celui que tu utiliseras dans git clone
}

export abstract class AbstractGitProvider {
    abstract readonly name: string;

    /**
     * Vérifie si un repository existe déjà pour un owner donné.
     */
    abstract repoExists(params: RepoExistsParams): Promise<boolean>;

    /**
     * Crée un nouveau repository.
     */
    abstract createRepository(params: CreateRepoParams): Promise<CreatedRepo>;
}
