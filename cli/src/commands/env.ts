// import { createLxc } from "../../../tunnel/src/utils/lxc-helpers.js";

// const env = await createLxc({
//     image: "images:debian/12",
//     profile: "zc-build",
// });

// // await env.push("~/.netrc", "/home/builder/.netrc");

// // TODO: 
// // - install openssh-server
// // - setup root password
// // - start zerochannel bridge with ssh

// export async function sh(): Promise<void> {
//     try {
//         const config = loadConfig();
//         const { environments } = await getTunnels(config.server, config.token);

//         if (Object.keys(environments).length === 0) {
//             console.log("❌ Aucun environnement disponible");
//             return;
//         }

//         console.log("🌍 Environnements disponibles :");

//         for (const [envName, services] of Object.entries(environments)) {
//             const serviceEntries = Object.entries(services);

//             console.log(`\n📁 ${envName}`);

//             if (serviceEntries.length === 0) {
//                 console.log("   ℹ️ Aucun service disponible");
//                 continue;
//             }

//             for (const [serviceName] of serviceEntries) {
//                 console.log(`   🔗 ${serviceName}`);
//             }
//         }

//     } catch (error) {
//         displayError(error);
//     }
// }
