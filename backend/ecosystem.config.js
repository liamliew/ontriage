module.exports = {
  apps: [
    {
      name: "ontriage-backend",
      script: "./bin/ontriage",
      env: {
        NODE_ENV: "production",
      },
      // Restart on failure
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
