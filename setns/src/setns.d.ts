declare module "*.node" {
    export function setns(fd: number, nstype: 'net' | 'pid' | 'mnt' | 'ipc' | 'uts' | 'user'): number;
}
