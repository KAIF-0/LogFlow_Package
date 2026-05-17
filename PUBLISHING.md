# Publishing Guide

## Prerequisites
- Node.js 18+
- npm account

## Commands
```
npm login
npm whoami
npm run build
npm pack
npm publish --access public
```

## Local Testing
```
npm link
npm unlink
```

## Update Workflow
```
npm version patch
npm run build
npm publish --access public
```

## Republish Workflow
```
npm deprecate logflow-sdk@<version> "Reason"
```

## Scoped Package Publish
```
npm publish --access public
```
