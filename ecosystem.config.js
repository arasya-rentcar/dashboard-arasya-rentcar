module.exports = {
  apps: [
    {
      name: 'web-arasya-rentcar',
      cwd: '/root/.openclaw/workspace/arasya-projects/dashboard-arasya-rentcar',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '20s',
      restart_delay: 5000,
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
