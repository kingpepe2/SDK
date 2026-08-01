# Publishing `@kingpepe2/sdk` to npm

The package is built, tested (12/12), and packed. Only authentication is left.

## 1. Authenticate (once)

Interactive:

```sh
npm login
```

…or non-interactive with an Automation/Granular token (publish rights) from
https://www.npmjs.com/settings/kingpepe2/tokens — put it in `C:\Users\user\.npmrc`:

```
//registry.npmjs.org/:_authToken=npm_XXXXXXXXXXXXXXXX
```

Verify:

```sh
npm whoami          # should print your username
```

## 2. Publish

```sh
cd C:\dev\kingpepe-sdk-js
npm run build && npm test        # optional re-verify
npm publish --access public      # no --force
```

> The scope `@kingpepe2` must be owned by your account. `publishConfig.access`
> is already `public`, so this publishes a public scoped package.

## 3. Verify

```sh
npm view @kingpepe2/sdk version          # -> 1.0.0
npm view @kingpepe2/sdk dist.tarball
```

Install test in a temp folder:

```sh
mkdir C:\Temp\kp-npm-test && cd C:\Temp\kp-npm-test
npm init -y >NUL
npm install @kingpepe2/sdk
node -e "const {KingPepeClient,SDK_VERSION}=require('@kingpepe2/sdk'); console.log(SDK_VERSION, typeof KingPepeClient)"
```
