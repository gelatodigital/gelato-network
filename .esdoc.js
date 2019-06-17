module.exports = {
  "source": "./src",
  "destination": "./build/docs",
  "includes": ["\\.j2s$"],
  "excludes": ["\\.config\\.js$"],
  "index": "./docs/overview.md",
  "plugins": [
  {
    "name": "esdoc-standard-plugin",
    "option": {
      "lint": {"enable": true},
      "coverage": {"enable": true},
      "accessor": {"access": ["public", "protected", "private"], "autoPrivate": true},
      "undocumentIdentifier": {"enable": true},
      "unexportedIdentifier": {"enable": false},
      "typeInference": {"enable": true},
      "brand": {
        // "logo": "./src/web/static/img/gnosis-logo-header.jpg",
        "logo": "./src/web/static/favicon.png",
        "title": "DutchX Services",
        "description": "Services and bots for the dutch exchange",
        /*
        "repository": "https://github.com/foo/bar",
        "site": "http://my-library.org",
        "author": "https://twitter.com/foo",
        */
        "image": "./src/web/static/img/gnosis-logo-header.jpg"
      },
      "manual": {
        "index": "./docs/overview.md",
        "globalIndex": true,
        "asset": "./docs/assets",
        "files": [
          "./docs/overview.md",
          "./docs/getting-started.md",
          "./docs/cli.md",
          "./docs/get-state-of-the-auctions.md",
          "./docs/trade.md",
          "./docs/api.md"
        ]
      }/*,
      "test": {
        "source": "./test/",
        "interfaces": ["describe", "it", "context", "suite", "test"],
        "includes": ["(spec|Spec|test|Test)\\.js$"],
        "excludes": ["\\.config\\.js$"]
      }*/
    }
  }] 
}