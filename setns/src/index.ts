import { setns } from '../build/Release/setns.node';

export type NamespaceType = 'net' | 'pid' | 'mnt' | 'ipc' | 'uts' | 'user';

/**
 * Entre dans le namespace spécifié d'un processus
 * @param fd Descripteur de fichier du namespace
 * @param nstype Type de namespace ('net', 'pid', 'mnt', 'ipc', 'uts', 'user')
 * @returns 0 en cas de succès, lance une erreur sinon
 */
export function enterNamespace(fd: number, nstype: NamespaceType): number {
    return setns(fd, nstype);
}

export default {
    enterNamespace
};
