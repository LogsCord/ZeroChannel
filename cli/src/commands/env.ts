import { createLxc } from "../utils/lxc-helpers.js";

const env = await createLxc({
    image: "images:debian/12",
    profile: "zc-build",
});

await env.push("~/.netrc", "/home/builder/.netrc");

// TODO: 
// - install openssh-server
// - setup root password
// - start zerochannel bridge with ssh


