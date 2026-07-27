module.exports = {
  apps: [
    {
      name: "vaultiq",
      script: "/home/optiplex/stack/apps/VaultIQ/dist/server.cjs",
      cwd: "/home/optiplex/stack/apps/VaultIQ",
      interpreter: "/home/optiplex/.nvm/versions/node/v22.22.2/bin/node",
      env: {
        NODE_ENV: "production",
        PORT: "8798",
      },
      restart_delay: 5000,
      autorestart: true,
    },
  ],
};
