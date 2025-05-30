import { input, password as promptPassword } from "@inquirer/prompts";
import { sayHello, authenticate } from "../services/api.js";
import { saveConfig } from "../config/loader.js";
import { isValidUrl } from "../utils/validation.js";
import { displayError } from "../utils/error.js";

export async function login(server: string): Promise<void> {
    try {
        if (!isValidUrl(server))
            throw new Error("L'URL du serveur n'est pas valide");

        const hello = await sayHello(server);

        if (hello.auth !== "simple")
            throw new Error("Méthode d'authentification non supportée");

        const username = await input({ message: "Username:" });
        const password = await promptPassword({ message: "Password:" });

        const { token } = await authenticate(server, username, password);
        saveConfig({ server, token });
        console.log("✅ Connecté. Token sauvegardé.");

    } catch (error) {
        displayError(error);
    }
}
