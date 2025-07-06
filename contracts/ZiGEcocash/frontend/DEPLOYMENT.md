# ZiGVerse Frontend - Production Deployment Guide

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file in the frontend directory:

```bash
# Network Configuration
NEXT_PUBLIC_NETWORK=polygon_zkevm
NEXT_PUBLIC_RPC_URL=https://your-polygon-zkevm-rpc-url.com
NEXT_PUBLIC_CHAIN_ID=1101

# WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id

# Optional: Analytics
NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=your_ga_id
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### 2. Build for Production

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Start production server
npm run start
```

## 🌐 Deployment Options

### Option 1: Vercel (Recommended)

1. **Connect Repository**
   - Push your code to GitHub/GitLab
   - Connect your repository to Vercel

2. **Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Set `NODE_ENV=production`

3. **Deploy**
   - Vercel will automatically build and deploy
   - Custom domain can be configured

### Option 2: Netlify

1. **Build Settings**
   - Build command: `npm run build`
   - Publish directory: `.next`
   - Node version: `18.x`

2. **Environment Variables**
   - Add all environment variables in Netlify dashboard

### Option 3: AWS Amplify

1. **Build Settings**
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
   ```

### Option 4: Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

## 🔧 Production Checklist

### ✅ Pre-Deployment

- [ ] Environment variables configured
- [ ] Contract addresses updated for production network
- [ ] RPC endpoints configured
- [ ] Analytics configured (if needed)
- [ ] Error monitoring set up
- [ ] SSL certificate configured
- [ ] Domain configured

### ✅ Post-Deployment

- [ ] All pages load correctly
- [ ] Wallet connection works
- [ ] Contract interactions work
- [ ] Error boundaries catch errors
- [ ] Performance monitoring active
- [ ] SEO meta tags working
- [ ] Mobile responsiveness verified

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use environment-specific files (`.env.production`)
- Rotate API keys regularly

### Headers
- Security headers are configured in `next.config.js`
- XSS protection enabled
- Content type sniffing disabled
- Frame options set to DENY

### Dependencies
- Regular security audits: `npm audit`
- Keep dependencies updated
- Use `npm ci` for production installs

## 📊 Monitoring & Analytics

### Error Monitoring
- Set up Sentry or similar error tracking
- Monitor JavaScript errors
- Track API failures

### Performance Monitoring
- Use Vercel Analytics or similar
- Monitor Core Web Vitals
- Track bundle sizes

### User Analytics
- Google Analytics (optional)
- Custom event tracking
- User behavior analysis

## 🚨 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf .next node_modules
   npm install
   npm run build
   ```

2. **Environment Variables**
   - Ensure all `NEXT_PUBLIC_` variables are set
   - Check for typos in variable names
   - Verify values are correct

3. **Contract Interactions**
   - Verify contract addresses for production network
   - Check RPC endpoint availability
   - Ensure wallet connection works

4. **Performance Issues**
   - Optimize images
   - Enable compression
   - Use CDN for static assets

## 📈 Performance Optimization

### Bundle Optimization
- Code splitting implemented
- Vendor chunks separated
- Tree shaking enabled

### Image Optimization
- Next.js Image component used
- WebP/AVIF formats supported
- Responsive images configured

### Caching
- Static generation for pages
- CDN caching headers
- Browser caching optimized

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      # Add deployment step here
```

## 📞 Support

For deployment issues:
1. Check the build logs
2. Verify environment variables
3. Test locally with production build
4. Check network connectivity
5. Review error monitoring

---

**Last Updated:** $(date)
**Version:** 1.0.0 