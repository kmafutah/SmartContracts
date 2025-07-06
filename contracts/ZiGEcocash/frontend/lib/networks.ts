export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  polygon_zkevm: {
    name: 'Polygon zkEVM',
    chainId: 1101,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://zkevm-rpc.com',
    explorerUrl: 'https://zkevm.polygonscan.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  polygon_zkevm_testnet: {
    name: 'Polygon zkEVM Testnet',
    chainId: 1442,
    rpcUrl: 'https://rpc.public.zkevm-test.net',
    explorerUrl: 'https://testnet-zkevm.polygonscan.com',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  localhost: {
    name: 'Localhost',
    chainId: 31337,
    rpcUrl: 'http://localhost:8545',
    explorerUrl: '',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

export const getCurrentNetwork = (): NetworkConfig => {
  const networkName = process.env.NEXT_PUBLIC_NETWORK || 'polygon_zkevm';
  return NETWORKS[networkName] || NETWORKS.polygon_zkevm;
};

export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development'; 