export type NamespaceType = 'net' | 'pid' | 'mnt' | 'ipc' | 'uts' | 'user';
/**
 * Entre dans le namespace spécifié d'un processus
 * @param fd Descripteur de fichier du namespace
 * @param nstype Type de namespace ('net', 'pid', 'mnt', 'ipc', 'uts', 'user')
 * @returns 0 en cas de succès, lance une erreur sinon
 */
export declare function enterNamespace(fd: number, nstype: NamespaceType): number;
declare const _default: {
    enterNamespace: typeof enterNamespace;
};
export default _default;
