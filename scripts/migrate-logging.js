#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Migration script to replace old logging patterns with new unified logger
 *
 * Usage: node scripts/migrate-logging.js [--dry-run] [--file path/to/file.ts]
 *
 * This script will:
 * 1. Replace console.log/warn/error with logger calls
 * 2. Update createFileDebugLogger usage to createLogger
 * 3. Fix debug() calls to logger methods
 */

const fs = require('fs')
const path = require('path')

// Patterns to match and replace
const PATTERNS = [
  // Pattern 1: console.log('[Namespace] message', data)
  {
    regex: /console\.(log|info|warn|error)\(['"](\[[\w:-]+\])\s*(.+?)['"](?:,\s*(.+?))?\)/g,
    replacement: (match, level, namespace, message, data) => {
      const logLevel = level === 'log' ? 'info' : level
      const ns = namespace.slice(1, -1) // Remove brackets
      const dataArg = data ? `, ${data}` : ''
      return `logger.${logLevel}('${message}'${dataArg})`
    }
  },

  // Pattern 2: console.log('message', data)
  {
    regex: /console\.(log|info|warn|error)\((['"`])(.+?)\2(?:,\s*(.+?))?\)/g,
    replacement: (match, level, quote, message, data) => {
      const logLevel = level === 'log' ? 'info' : level
      const dataArg = data ? `, ${data}` : ''
      return `logger.${logLevel}('${message}'${dataArg})`
    }
  },

  // Pattern 3: createFileDebugLogger import
  {
    regex: /import\s*{\s*createFileDebugLogger\s*}\s*from\s*(['"])(.+?)logger\1/g,
    replacement: (match, quote, path) => {
      return `import { createLogger } from ${quote}${path}logger${quote}`
    }
  },

  // Pattern 4: const debug = createFileDebugLogger('namespace')
  {
    regex: /const\s+(\w+)\s*=\s*createFileDebugLogger\(['"](.+?)['"]\)/g,
    replacement: (match, varName, namespace) => {
      return `const logger = createLogger('${namespace}')`
    }
  },

  // Pattern 5: debug('message') calls
  {
    regex: /\b(debug)\(['"](.+?)['"]\)/g,
    replacement: (match, debugVar, message) => {
      return `logger.debug('${message}')`
    }
  }
]

function processFile(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf-8')
  let newContent = content
  let changes = []

  // Apply all patterns
  PATTERNS.forEach((pattern, index) => {
    const before = newContent
    newContent = newContent.replace(pattern.regex, (...args) => {
      const match = args[0]
      const result = pattern.replacement(...args)
      if (match !== result) {
        changes.push({
          pattern: index + 1,
          from: match,
          to: result
        })
      }
      return result
    })
  })

  // Check if we need to add logger import
  const hasLoggerCalls = /logger\.(debug|info|warn|error|log)\(/.test(newContent)
  const hasLoggerImport = /import.*createLogger.*from.*logger/.test(newContent)

  if (hasLoggerCalls && !hasLoggerImport && !content.includes('class Logger')) {
    // Find the last import statement
    const lines = newContent.split('\n')
    let lastImportIndex = -1

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i
      }
    }

    if (lastImportIndex >= 0) {
      // Calculate relative path to logger
      const fileDir = path.dirname(filePath)
      const loggerPath = path.join(__dirname, '../src/main/utils/logger.ts')
      let relativePath = path.relative(fileDir, path.dirname(loggerPath))

      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath
      }
      relativePath = relativePath.replace(/\\/g, '/')

      lines.splice(lastImportIndex + 1, 0, `import { createLogger } from '${relativePath}/logger'`)
      newContent = lines.join('\n')
      changes.push({
        pattern: 'import',
        from: '',
        to: `Added logger import`
      })
    }
  }

  if (changes.length === 0) {
    return { changed: false, changes: [] }
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, newContent, 'utf-8')
  }

  return { changed: true, changes }
}

function walkDirectory(dir, callback) {
  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      if (!file.startsWith('.') && file !== 'node_modules' && file !== 'dist') {
        walkDirectory(filePath, callback)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath)
    }
  })
}

// Main execution
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const fileArg = args.find((arg) => arg.startsWith('--file='))
const targetFile = fileArg ? fileArg.split('=')[1] : null

console.log('🔍 Toji3 Logging Migration Tool')
console.log('================================\n')

if (dryRun) {
  console.log('⚠️  DRY RUN MODE - No files will be modified\n')
}

const srcDir = path.join(__dirname, '../src')
let filesProcessed = 0
let filesChanged = 0

if (targetFile) {
  console.log(`Processing single file: ${targetFile}\n`)
  const result = processFile(targetFile, dryRun)
  if (result.changed) {
    console.log(`✅ ${targetFile}`)
    result.changes.forEach((change) => {
      console.log(`   Pattern ${change.pattern}:`)
      console.log(`   - ${change.from}`)
      console.log(`   + ${change.to}`)
    })
    filesChanged++
  } else {
    console.log(`⏭️  ${targetFile} (no changes needed)`)
  }
  filesProcessed++
} else {
  walkDirectory(srcDir, (filePath) => {
    filesProcessed++
    const result = processFile(filePath, dryRun)

    if (result.changed) {
      filesChanged++
      const relativePath = path.relative(process.cwd(), filePath)
      console.log(`✅ ${relativePath}`)

      if (dryRun) {
        result.changes.forEach((change) => {
          console.log(`   Pattern ${change.pattern}:`)
          console.log(`   - ${change.from}`)
          console.log(`   + ${change.to}`)
        })
        console.log()
      }
    }
  })
}

console.log('\n================================')
console.log(`📊 Summary:`)
console.log(`   Files processed: ${filesProcessed}`)
console.log(`   Files changed: ${filesChanged}`)
console.log(`   Files unchanged: ${filesProcessed - filesChanged}`)

if (dryRun && filesChanged > 0) {
  console.log('\n💡 Run without --dry-run to apply changes')
}

console.log('\n✨ Migration complete!')
