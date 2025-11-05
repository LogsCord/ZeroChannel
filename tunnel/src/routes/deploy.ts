import express, { Router } from "express";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execa } from "execa";
import { withEphemeralLxc } from "../utils/lxc-helpers.js";
import { wrapImageWithZeroinit } from "../utils/wrap-image.js";
import { validateAuth } from "../auth/jwt.js";
import { createConnection, Logger } from "../utils/connection.js";

interface DeployOptions {
    envName: string;
    repoUrl: string;
    branch: string;
    gitUser: string;
    gitToken: string;
}

interface DeployResult {
    containerName: string;
    nonce: string;
}

function deriveImageTag(repoUrl: string, branch: string) {
    const match = repoUrl.toLowerCase().match(/github\.com[/:](.+?)\/(.+?)(\.git)?$/);
    const org = match?.[1]?.replace(/[^a-z0-9-]/g, "") || "org";
    const repo = match?.[2]?.replace(/[^a-z0-9-]/g, "") || "repo";

    return `${org}/${repo}:${branch}`;
}

function sanitize(s: string) {
    return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function deploy(options: DeployOptions, logger: Logger): Promise<DeployResult> {
    const {
        envName,
        repoUrl,
        branch,
        gitUser,
        gitToken
    } = options;

    const imageTag = deriveImageTag(repoUrl, branch);
    const outTar = join(tmpdir(), `${sanitize(imageTag)}.tar`);

    await withEphemeralLxc({
        image: "images:debian/12",
        profile: "zc-build",
        logger
    }, async (lxc) => {

        // 1) deps & BuildKit rootless
        await lxc.exec(`
set -e
apt-get update -y
apt-get install -y --no-install-recommends git ca-certificates uidmap fuse3 curl xz-utils
ARCH=$(dpkg --print-architecture)
VER="v0.23.2"
curl -sSL -o /tmp/buildkit.tgz https://github.com/moby/buildkit/releases/download/${'$'}VER/buildkit-${'$'}VER.linux-${'$'}ARCH.tar.gz
tar -C /usr/local -xzf /tmp/buildkit.tgz
groupadd -r builder || true
useradd -m -r -g builder builder || true
mkdir -p /workspace /out
chown -R builder:builder /workspace /out
        `);

        // 2) clone (via netrc temporaire)
        await lxc.exec(`
set -e
su - builder -c '
umask 077
cat > ~/.netrc <<EOF
machine github.com
login ${gitUser.replace(/'/g, "'\\''")}
password ${gitToken.replace(/'/g, "'\\''")}
EOF

git config --global credential.helper ""
git clone --depth 1 --branch ${branch.replace(/'/g, "'\\''")} ${repoUrl.replace(/'/g, "'\\''")} /workspace/repo

shred -u ~/.netrc
'`);

        // 3) build Docker image (export tar)
        await lxc.exec(`
set -e
mkdir -p /run/buildkit

# Démarrer buildkitd (pas rootless) dans l'environnement LXC unprivileged
buildkitd \
--addr unix:///run/buildkit/buildkitd.sock \
--oci-worker-no-process-sandbox \
--root /var/lib/buildkit \
>/var/log/buildkitd.log 2>&1 &

# Attendre le socket
for i in $(seq 1 50); do
[ -S /run/buildkit/buildkitd.sock ] && break
sleep 0.1
done
[ -S /run/buildkit/buildkitd.sock ]

cd /workspace/repo

# Export docker-archive compressé (petit)
buildctl --addr unix:///run/buildkit/buildkitd.sock build \
--frontend dockerfile.v0 \
--local context=. \
--local dockerfile=. \
--opt filename=Dockerfile \
--output type=docker,oci-mediatypes=true,compression=gzip,force-compression=true,name=${imageTag.replace(/'/g,"'\\''")},dest=/out/image.tar
        `);

        // 4) pull tar sur l’hôte
        await lxc.pull("out/image.tar", outTar);
    });

    // 5) Charger localement
    await execa(
        "docker",
        [ "load", "-i", outTar ],
        { stdio: "inherit" }
    );

    // 6) Wrapper l'image avec zeroinit
    const wrappedTag = await wrapImageWithZeroinit({
        baseImage: imageTag,                        // ex: "animeotv/test:main"
        zeroinitHostPath: resolve("bin/zeroinit.sh"),  // ton binaire sur le host
        outputTag: `${imageTag}-zc`,                // ex: "animeotv/test:main-zc"
    });

    logger.info(`✅ Image wrappée prête: ${wrappedTag}`);

    const nonce = randomUUID();
    const containerName = imageTag.toLowerCase().replace(/[^a-z0-9]/g, "-");

    await execa(
        "docker",
        [
            "run", "-d",
            "--name", containerName,
            "-e", "ZC_NONCE=" + nonce,
            "-e", "ZC_SOCKET=/var/run/zerochannel/agent.sock",
            "-v", "/var/run/zerochannel:/var/run/zerochannel",
            wrappedTag
        ],
        { stdio: "inherit" }
    );

    logger.info(`✅ Container démarré: ${containerName}`);
    logger.info(`✅ Nonce: ${nonce}`);
    logger.info(`✅ Agent ZeroChannel démarré sur le socket: /var/run/zerochannel/agent.sock`);

    return {
        containerName,
        nonce,
    };
}

const router = Router();

router.post("/", express.json(), async (req, res) => {
    const session = validateAuth(req);
    if (!session)
        return void res.status(401).send("Unauthorized");

    const { envName, repoUrl, branch, gitUser, gitToken } = req.body;
    const isValid = (typeof envName !== "string")
        || (typeof repoUrl !== "string")
        || (typeof branch !== "string")
        || (typeof gitUser !== "string")
        || (typeof gitToken !== "string");

    if (isValid)
        return void res.status(400).send("Missing parameters");

    const connection = createConnection();
    const logger = connection.logger;

    res.json({ uuid: connection.uuid });

    (async () => {
        try {
            const result = await deploy({ envName, repoUrl, branch, gitUser, gitToken }, logger);
            logger.info("✅ Deployment terminé");
            connection.send({ type: "result", result });

        } catch (error) {
            logger.error(error);
        }
    })();
});

export default router;
