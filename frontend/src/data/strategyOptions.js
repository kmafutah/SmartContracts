import deployment from '../../../deployments/deployment-skale_testnet.json';

const strategies = Object.entries(deployment.Strategies).map(([name, address]) => ({
  label: name,
  value: address,
}));

export default strategies;
