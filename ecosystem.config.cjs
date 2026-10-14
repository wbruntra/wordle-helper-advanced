module.exports = {
  apps: [
    {
      name: 'wordle-helper-api',
      script: 'bin/www',
      interpreter: 'bun',
      cwd: __dirname,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
}
