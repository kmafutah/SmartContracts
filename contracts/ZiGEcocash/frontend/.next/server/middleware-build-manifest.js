self.__BUILD_MANIFEST = {
  "polyfillFiles": [
    "static/chunks/polyfills.js"
  ],
  "devFiles": [
    "static/chunks/react-refresh.js"
  ],
  "ampDevFiles": [],
  "lowPriorityFiles": [],
  "rootMainFiles": [],
  "pages": {
    "/_app": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_app.js"
    ],
    "/_error": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/_error.js"
    ],
    "/dao": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/dao.js"
    ],
    "/dao-oracle": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/dao-oracle.js"
    ],
    "/gamefi-map": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/gamefi-map.js"
    ],
    "/identity": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/identity.js"
    ],
    "/merchants": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/merchants.js"
    ],
    "/nfts": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/nfts.js"
    ],
    "/regional-stablecoins": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/regional-stablecoins.js"
    ],
    "/tokens": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/tokens.js"
    ],
    "/vault": [
      "static/chunks/webpack.js",
      "static/chunks/main.js",
      "static/chunks/pages/vault.js"
    ]
  },
  "ampFirstPages": []
};
self.__BUILD_MANIFEST.lowPriorityFiles = [
"/static/" + process.env.__NEXT_BUILD_ID + "/_buildManifest.js",
,"/static/" + process.env.__NEXT_BUILD_ID + "/_ssgManifest.js",

];