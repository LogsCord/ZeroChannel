import { createAPI, DeleteSecretsOptions } from "../../services/api.js";
import { displayError } from "../../utils/error.js";

export async function deleteSecret(options: DeleteSecretsOptions): Promise<void> {
    try {
        const API = createAPI();
        const { deleted } = await API.deleteSecret(options);

        if (deleted) {
            console.log(`✅ Secret "${options.name}" supprimé`);

        } else {
            console.log(`❌ Secret "${options.name}" non défini`);
        }

    } catch (error) {
        displayError(error);
    }
}
