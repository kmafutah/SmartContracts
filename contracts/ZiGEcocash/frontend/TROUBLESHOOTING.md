# ZiGVerse Frontend - Troubleshooting Guide

## 🚨 Static Assets Not Loading (`/_next/` vs `_next/`)

### Problem Description
When deploying the Next.js application, static assets (CSS, JS, images) are not loading properly. The browser is looking for assets at `/_next/` but they should be served from `_next/`.

### Root Cause
This issue typically occurs when:
1. The deployment platform doesn't handle Next.js static assets correctly
2. Base path configuration is missing or incorrect
3. Asset prefix is not properly configured
4. The deployment is not using the correct Next.js output format

### Solutions

#### 1. Environment Variables
Add these to your `.env.local` file:
```bash
NEXT_PUBLIC_BASE_PATH=
NEXT_PUBLIC_ASSET_PREFIX=
NODE_ENV=production
```

#### 2. Platform-Specific Fixes

**For Vercel:**
- No additional configuration needed (handled automatically)
- Ensure `NODE_ENV=production` is set

**For Netlify:**
- Add `_redirects` file in `public/` directory:
```
/*    /index.html   200
```
- Set build command: `npm run build`
- Set publish directory: `.next`

**For AWS Amplify:**
- Use the updated `next.config.js` configuration
- Ensure `output: 'standalone'` is set

**For Docker:**
- Use the provided Dockerfile
- Ensure proper port mapping

#### 3. Manual Fix
If the issue persists, try these steps:

1. **Clear cache and rebuild:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

2. **Check asset paths in browser dev tools:**
- Open browser developer tools
- Go to Network tab
- Look for failed requests to `/_next/` paths
- Verify the correct paths should be `_next/`

3. **Verify configuration:**
```bash
# Check if basePath is set correctly
grep -r "basePath" next.config.js
```

### Testing Locally

1. **Test production build locally:**
```bash
npm run build
npm run start
```

2. **Check asset loading:**
- Open browser developer tools
- Go to Network tab
- Refresh the page
- Look for any failed requests to static assets

### Common Error Messages

- `404 Not Found` for `/_next/static/...`
- `Failed to load resource` for CSS/JS files
- Blank page with console errors about missing assets

### Prevention

1. **Always test production build locally before deployment**
2. **Use the provided deployment script:**
```bash
./scripts/deploy.sh
```

3. **Check environment variables are set correctly**
4. **Verify the deployment platform supports Next.js properly**

### Platform-Specific Notes

**Vercel (Recommended):**
- Handles Next.js deployments automatically
- No additional configuration needed
- Best performance and reliability

**Netlify:**
- Requires `_redirects` file
- May need custom build settings
- Good for static sites

**AWS Amplify:**
- Supports Next.js out of the box
- Use the updated configuration
- Good for AWS ecosystem integration

**Docker:**
- Use the provided Dockerfile
- Ensure proper environment variables
- Good for containerized deployments

### Getting Help

If the issue persists:
1. Check the browser console for specific error messages
2. Verify all environment variables are set
3. Test with a minimal Next.js app to isolate the issue
4. Check the deployment platform's documentation for Next.js support

---

**Last Updated:** $(date)
**Version:** 1.0.0 