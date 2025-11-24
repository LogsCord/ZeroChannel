import { password } from "@inquirer/prompts";
import { createAPI } from "../../services/api.js";
import { displayError } from "../../utils/error.js";
import { encryptSecretPayload, ZeroTEEPubKey } from "../../utils/encrypt.js";

interface SetSecretOptions {
    infraName: string;
    projectName: string;
    name: string;
}

export async function setSecret(options: SetSecretOptions): Promise<void> {
    try {
        const API = createAPI();
        const unsecureName = options.name;
        const unsecureSecret = await password({ message: "Value: " });
        const encrypted = await encryptSecretPayload(ZeroTEEPubKey, unsecureName, unsecureSecret);

        await API.setSecret({
            infraName: options.infraName,
            projectName: options.projectName,
            encryptedPayload: encrypted,
        });

        console.log(`✅ Secret "${options.name}" modifié`);

    } catch (error) {
        displayError(error);
    }
}
