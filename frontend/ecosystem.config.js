module.exports = {
    apps: [
        {
            name: "ontriage-web",
            script: "node_modules/.bin/next",
            args: "start -p 7710",
            cwd: "/root/ontriage/frontend",
            env: {
                NODE_ENV: "production",
            },
            autorestart: true,
            watch: false,
            max_memory_restart: "1G",
        },
    ],
};