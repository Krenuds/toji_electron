#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Batch migration script - converts all log() calls to logger.debug() calls
 * This handles the pattern where createFileDebugLogger returns a callable function
 */

const fs = require('fs')
const path = require('path')

const filesToMigrate = [
  'src/main/handlers/toji-events.handlers.ts',
  'src/main/handlers/voice.handlers.ts',
  'src/main/services/docker-service-manager.ts',
  'src/main/services/piper-client.ts',
  'src/main/services/voice-service-manager.ts',
  'src/main/services/whisper-client.ts',
  'src/main/toji/client-manager.ts',
  'src/main/toji/config-manager.ts',
  'src/main/toji/index.ts',
  'src/main/toji/mcp/mcp-manager.ts',
  'src/main/toji/mcp/tools/discord-channel-info.ts',
  'src/main/toji/mcp/tools/discord-list-channels.ts',
  'src/main/toji/mcp/tools/discord-messages.ts',
  'src/main/toji/mcp/tools/discord-search-messages.ts',
  'src/main/toji/mcp/tools/discord-upload.ts',
  'src/main/toji/project-initializer.ts',
  'src/main/toji/project.ts',
  'src/main/toji/server.ts',
  'src/main/toji/sessions.ts',
  'src/main/utils/audio-processor.ts',
  'src/plugins/discord/commands/clear.ts',
  'src/plugins/discord/commands/voice.ts',
  'src/plugins/discord/deploy-commands.ts',
  'src/plugins/discord/DiscordPlugin.ts',
  'src/plugins/discord/modules/CategoryManager.ts',
  'src/plugins/discord/modules/DiscordProjectManager.ts',
  'src/plugins/discord/modules/SlashCommandModule.ts',
  'src/plugins/discord/utils/errors.ts',
  'src/plugins/discord/utils/mcp-channel-info.ts',
  'src/plugins/discord/utils/mcp-channel-lister.ts',
  'src/plugins/discord/utils/mcp-fetcher.ts',
  'src/plugins/discord/utils/mcp-message-searcher.ts',
  'src/plugins/discord/utils/mcp-uploader.ts',
  'src/plugins/discord/utils/messages.ts',
  'src/plugins/discord/utils/permissions.ts',
  'src/plugins/discord/utils/state.ts',
  'src/plugins/discord/voice/AudioReceiver.ts',
  'src/plugins/discord/voice/TTSPlayer.ts',
  'src/plugins/discord/voice/VoiceModule.ts'
]

function migrateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath)
  let content = fs.readFileSync(fullPath, 'utf-8')

  // Step 1: Change import
  content = content.replace(
    /import\s*{\s*createFileDebugLogger\s*}\s*from\s*(['"])(.+?)logger\1/g,
    (match, quote, pathStr) => `import { createLogger } from ${quote}${pathStr}logger${quote}`
  )

  // Step 2: Change variable declaration
  content = content.replace(
    /const\s+log\s*=\s*createFileDebugLogger\(['"](.+?)['"]\)/g,
    (match, namespace) => `const logger = createLogger('${namespace}')`
  )

  // Step 3: Replace all log( calls with logger.debug(
  // This is the tricky part - we need to handle various patterns

  // Pattern 1: log('simple string')
  content = content.replace(/\blog\((['"])/g, 'logger.debug($1')

  // Pattern 2: log(`template string`)
  content = content.replace(/\blog\(`/g, 'logger.debug(`')

  // Pattern 3: log( with whitespace
  content = content.replace(/\blog\(\s+/g, 'logger.debug(')

  fs.writeFileSync(fullPath, content, 'utf-8')
  return filePath
}

console.log('🔄 Starting batch logger migration...\n')

let successCount = 0
let errorCount = 0

filesToMigrate.forEach((file) => {
  try {
    migrateFile(file)
    console.log(`✅ ${file}`)
    successCount++
  } catch (error) {
    console.error(`❌ ${file}: ${error.message}`)
    errorCount++
  }
})

console.log(`\n📊 Migration complete!`)
console.log(`   Success: ${successCount}`)
console.log(`   Errors: ${errorCount}`)
console.log(`   Total: ${filesToMigrate.length}`)
