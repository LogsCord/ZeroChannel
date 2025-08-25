"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterNamespace = enterNamespace;
const setns_node_1 = require("../build/Release/setns.node");
/**
 * Entre dans le namespace spécifié d'un processus
 * @param fd Descripteur de fichier du namespace
 * @param nstype Type de namespace ('net', 'pid', 'mnt', 'ipc', 'uts', 'user')
 * @returns 0 en cas de succès, lance une erreur sinon
 */
function enterNamespace(fd, nstype) {
    return (0, setns_node_1.setns)(fd, nstype);
}
exports.default = {
    enterNamespace
};
