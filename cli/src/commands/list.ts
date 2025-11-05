import { loadConfig } from "../config/loader.js";
import { createAPI } from "../services/api.js";
import { displayError } from "../utils/error.js";

export async function list(): Promise<void> {
    try {
        const API = createAPI();
        const { environments } = await API.getTunnels();

        if (Object.keys(environments).length === 0) {
            console.log("❌ Aucun environnement disponible");
            return;
        }

        console.log("🌍 Environnements disponibles :");

        for (const [envName, services] of Object.entries(environments)) {
            const serviceEntries = Object.entries(services);

            console.log(`\n📁 ${envName}`);

            if (serviceEntries.length === 0) {
                console.log("   ℹ️ Aucun service disponible");
                continue;
            }

            for (const [serviceName] of serviceEntries) {
                console.log(`   🔗 ${serviceName}`);
            }
        }

    } catch (error) {
        displayError(error);
    }
}
