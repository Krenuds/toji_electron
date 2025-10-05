/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')

let content = fs.readFileSync('src/main/toji/index.ts', 'utf8')

// Replace logClient and logChat calls
content = content.replaceAll('logClient(', 'loggerClient.debug(')
content = content.replaceAll('logChat(', 'loggerChat.debug(')

// Replace console.logger.debug with logger.debug
content = content.replaceAll('console.logger.debug', 'logger.debug')

// Also fix console.error that have [Toji] prefix - change to logger.error
content = content.replace(/console\.error\('\[Toji\] /g, "logger.error('")

fs.writeFileSync('src/main/toji/index.ts', content)
console.log('✅ Fixed toji/index.ts logger calls')
