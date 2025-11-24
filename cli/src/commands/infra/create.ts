import { createAPI, CreateInfraOptions } from "../../services/api.js";
import { displayError } from "../../utils/error.js";

export async function create(options: CreateInfraOptions): Promise<void> {
    try {
        const API = createAPI();
        const { id, name } = await API.createInfrastructure(options);

        console.log("✅ Infrastructure créée");
        console.log("\t- ID: ", id);
        console.log("\t- Name: ", name);

    } catch (error) {
        displayError(error);
    }
}
