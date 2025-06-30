/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for Web Worker modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Handle the specific HeartbeatWorker file
    config.module.rules.push({
      test: /HeartbeatWorker\.js$/,
      type: 'javascript/auto',
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-transform-modules-commonjs'],
        },
      },
    });

    // Handle ESM/CommonJS compatibility for problematic packages (excluding CSS files)
    config.module.rules.push({
      test: /node_modules\/(@walletconnect|@reown|@rainbow-me)\/.*\.(js|ts|tsx)$/,
      exclude: /\.css$/,
      type: 'javascript/auto',
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: ['@babel/plugin-transform-modules-commonjs'],
        },
      },
    });

    return config;
  },
  experimental: {
    esmExternals: 'loose',
  },
  // Transpile problematic packages
  transpilePackages: [
    '@vanilla-extract/css',
    '@vanilla-extract/sprinkles',
    '@rainbow-me/rainbowkit',
    'wagmi',
    '@walletconnect/ethereum-provider',
    '@reown/appkit'
  ],
};

module.exports = nextConfig; 