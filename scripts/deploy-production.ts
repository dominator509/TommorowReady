if (process.env.AUTO_DEPLOY_AUTHORIZED !== 'yes') {
  console.error('deployment: BLOCKED - AUTO_DEPLOY_AUTHORIZED is not yes');
  process.exit(1);
}
console.error(
  'deployment: BLOCKED - production platform adapter and reviewed infrastructure values are required',
);
process.exit(1);
