import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { execa } from "execa";
import { input, password } from "@inquirer/prompts";
import { withEphemeralLxc } from "../utils/lxc-helpers.js";
import { wrapImageWithZeroinit } from "../utils/wrap-image.js";
import { displayError } from "../utils/error.js";

type DeployOptions = {
    env?: string;
    repo?: string;
    branch?: string;
};

function deriveImageTag(repoUrl: string, branch: string) {
    const match = repoUrl.toLowerCase().match(/github\.com[/:](.+?)\/(.+?)(\.git)?$/);
    const org = match?.[1]?.replace(/[^a-z0-9-]/g, "") || "org";
    const repo = match?.[2]?.replace(/[^a-z0-9-]/g, "") || "repo";

    return `${org}/${repo}:${branch}`;
}

function sanitize(s: string) {
    return s.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function deploy(options: DeployOptions) {
    try {
        const envName = options.env || await input({ message: "Environment name:" });
        const repoUrl = options.repo || await input({ message: "Repository URL (https):" });
        const branch = options.branch || await input({ message: "Branch name:" });
        const gitUser = await input({ message: "GitHub username:" });
        const gitToken = await password({ message: "Git token (read-only):" });

        const imageTag = deriveImageTag(repoUrl, branch);
        const outTar = join(tmpdir(), `${sanitize(imageTag)}.tar`);

        await withEphemeralLxc({
            image: "images:debian/12",
            profile: "zc-build"
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

        console.log(`✅ Image wrappée prête: ${wrappedTag}`);

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

        console.log(`✅ Container démarré: ${containerName}`);
        console.log(`✅ Nonce: ${nonce}`);
        console.log(`✅ Agent ZeroChannel démarré sur le socket: /var/run/zerochannel/agent.sock`);

    } catch (error) {
        displayError(error);
    }
}
