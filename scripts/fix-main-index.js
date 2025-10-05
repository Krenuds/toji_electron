/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
let content = fs.readFileSync('src/main/index.ts', 'utf8')
content = content.replaceAll('logStartup(', 'loggerStartup.debug(')
content = content.replaceAll('logCleanup(', 'loggerCleanup.debug(')
fs.writeFileSync('src/main/index.ts', content)
console.log('✅ Fixed main/index.ts logger calls')
