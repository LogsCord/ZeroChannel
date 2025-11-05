import { displayError } from "../utils/error.js";
import { createAPI } from "../services/api.js";
import { setupConsole } from "../utils/console.js";

export async function sh() {
    try {
        const API = createAPI();
        const { stream } = await API.sh();

        setupConsole(stream);

    } catch (error) {
        displayError(error);
    }
}
