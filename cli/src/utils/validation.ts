import { AxiosError } from 'axios';

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Handles Axios errors and returns appropriate error messages
 */
export function handleAxiosError(error: unknown): string {
    if (error instanceof AxiosError) {
        // Gestion des erreurs de connectivité
        if (error.code === 'ECONNREFUSED') {
            return "Impossible de se connecter au serveur (connexion refusée)";
        }
        if (error.code === 'ENOTFOUND') {
            return "Impossible de résoudre l'adresse du serveur (DNS non trouvé)";
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return "La connexion au serveur a expiré (timeout)";
        }
        if (error.code === 'EHOSTUNREACH') {
            return "Le serveur est injoignable (host unreachable)";
        }

        // Gestion des erreurs HTTP
        if (error.response) {
            switch (error.response.status) {
                case 404:
                    return "Le lien n'est pas valide ou n'héberge pas de tunnel ZeroChannel (statut 404)";
                case 401:
                    return "Authentification requise (statut 401)";
                default:
                    return `Erreur ${error.response.status}: ${error.response.data || error.message}`;
            }
        }

        // Autres erreurs Axios
        return `Erreur de connexion: ${error.message}`;
    }

    if (error instanceof Error)
        return error.message;

    return "Une erreur inattendue s'est produite";
}
