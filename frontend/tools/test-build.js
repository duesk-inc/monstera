const { exec } = require('child_process');

console.log('Starting build test...');

exec('npm run build', { cwd: __dirname }, (error, stdout, stderr) => {
  if (error) {
    console.error('Build failed:', error.message);
    if (stderr) console.error('stderr:', stderr);
    process.exit(1);
  }
  console.log('Build output:', stdout);
  console.log('Build completed successfully!');
});