import { createAPI, ListSecretsOptions } from "../../services/api.js";
import { displayError } from "../../utils/error.js";

export async function listSecrets(options: ListSecretsOptions): Promise<void> {
    try {
        const API = createAPI();
        const { secrets } = await API.listSecrets(options);

        const secretsStr = secrets
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((secret) => `\t- ${secret.name}`)
            .join("\n");

        console.log("✅ Secrets listées");
        console.log("Secrets:");
        console.log(secretsStr);

    } catch (error) {
        displayError(error);
    }
}
