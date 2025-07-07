/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Base path configuration for production deployments
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || '',
  
  // Static export for GitHub Pages
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },

  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    unoptimized: true,
  },

  // Experimental features
  experimental: {
    esmExternals: true,
  },

  // Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

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

  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
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