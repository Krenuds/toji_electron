#!/usr/bin/env node
/**
 * Generate Review Priorities
 * Combines static analysis (dependencies) with runtime analysis (logs)
 * to create a prioritized list of modules to review
 */

const fs = require('fs')
const path = require('path')

console.log('🎯 Generating Review Priorities\n')

// Load dependency metrics
const depsFile = 'analysis/dependency-metrics.json'
const logSummaryFile = 'analysis/log-summary.json'

let dependencies = { modules: [] }
let logSummary = { topNamespaces: [] }

if (fs.existsSync(depsFile)) {
  try {
    const content = fs.readFileSync(depsFile, 'utf8')
    // Remove BOM if present
    const cleanContent = content.replace(/^\uFEFF/, '')
    dependencies = JSON.parse(cleanContent)
    console.log(`✅ Loaded dependency metrics (${dependencies.modules.length} modules)`)
  } catch (error) {
    console.log(`⚠️  Could not parse ${depsFile}: ${error.message}`)
  }
} else {
  console.log(`⚠️  ${depsFile} not found - run setup-review-workspace.ps1 first`)
}

if (fs.existsSync(logSummaryFile)) {
  logSummary = JSON.parse(fs.readFileSync(logSummaryFile, 'utf8'))
  console.log(`✅ Loaded log summary`)
} else {
  console.log(`⚠️  ${logSummaryFile} not found`)
}

// Calculate priority scores
const priorities = []

// Map log namespaces to file patterns
const namespaceToPath = {
  toji: 'src/main/toji',
  discord: 'src/plugins/discord',
  mcp: 'src/main/toji/mcp',
  voice: 'src/plugins/discord/voice',
  whisper: 'src/main/services/whisper',
  piper: 'src/main/services/piper',
  docker: 'src/main/services/docker'
}

// Create a map of log frequency by path prefix
const logFrequency = {}
logSummary.topNamespaces.forEach((ns) => {
  const pathPrefix = namespaceToPath[ns.namespace] || ns.namespace
  logFrequency[pathPrefix] = ns.count
})

// Score each module
dependencies.modules.forEach((mod) => {
  const modulePath = mod.source

  // Skip node_modules and test files
  if (
    modulePath.includes('node_modules') ||
    modulePath.includes('.spec.') ||
    modulePath.includes('.test.')
  ) {
    return
  }

  // Calculate metrics
  const dependencyCount = mod.dependencies ? mod.dependencies.length : 0
  const hasCircular = mod.dependencies?.some((d) => d.circular) || false

  // Find matching log frequency
  let logCount = 0
  for (const [pathPrefix, count] of Object.entries(logFrequency)) {
    if (modulePath.includes(pathPrefix)) {
      logCount = count
      break
    }
  }

  // Calculate priority score (higher = more important to review)
  let score = 0

  // Factor 1: Complexity (more dependencies = higher priority)
  score += dependencyCount * 2

  // Factor 2: Circular dependencies (critical issue)
  if (hasCircular) score += 50

  // Factor 3: Runtime usage (more logs = more active)
  score += logCount / 10

  // Factor 4: Layer (core > services > handlers > utils)
  if (modulePath.includes('toji/index.ts')) score += 30
  else if (modulePath.includes('src/main/toji/')) score += 20
  else if (modulePath.includes('src/main/services/')) score += 15
  else if (modulePath.includes('src/main/handlers/')) score += 10
  else if (modulePath.includes('src/plugins/discord/')) score += 15

  priorities.push({
    path: modulePath,
    score: Math.round(score),
    metrics: {
      dependencies: dependencyCount,
      hasCircular,
      logFrequency: logCount
    }
  })
})

// Sort by priority score (descending)
priorities.sort((a, b) => b.score - a.score)

// Generate markdown report
const top20 = priorities.slice(0, 20)

let markdown = `# Review Priorities

**Generated:** ${new Date().toISOString()}

## Scoring System

- **Dependencies:** +2 points per dependency
- **Circular Dependency:** +50 points (CRITICAL)
- **Log Frequency:** +0.1 point per log entry
- **Layer Bonus:**
  - Toji Core: +30 points
  - Main Toji: +20 points
  - Services: +15 points
  - Discord Plugin: +15 points
  - Handlers: +10 points

---

## Top 20 Priority Modules

`

top20.forEach((item, index) => {
  const fileName = path.basename(item.path)
  const relativePath = item.path.replace(/\\/g, '/')

  markdown += `### ${index + 1}. \`${fileName}\` (Score: ${item.score})

**Path:** \`${relativePath}\`

**Metrics:**
- Dependencies: ${item.metrics.dependencies}
- Circular Dependencies: ${item.metrics.hasCircular ? '⚠️ YES' : '✅ No'}
- Log Frequency: ${item.metrics.logFrequency} entries

**Review Priority:** ${
    item.score > 50
      ? '🔴 **CRITICAL**'
      : item.score > 30
        ? '🟠 **HIGH**'
        : item.score > 15
          ? '🟡 **MEDIUM**'
          : '🟢 **LOW**'
  }

**Review Checklist:**
- [ ] Verify error handling is complete
- [ ] Check resource cleanup
- [ ] Validate type safety (no \`any\` types)
- [ ] Review dependency necessity
${item.metrics.hasCircular ? '- [ ] **URGENT:** Fix circular dependency' : ''}
- [ ] Add/update tests
- [ ] Update documentation

---

`
})

markdown += `## Review Progress Tracker

Track your progress here:

`

top20.forEach((item, index) => {
  const fileName = path.basename(item.path)
  markdown += `- [ ] ${index + 1}. ${fileName}\n`
})

markdown += `
---

## Next Steps

1. Review modules in order (top to bottom)
2. Check off items as you complete them
3. Document findings in \`reviews/[module-name].md\`
4. Re-run this script after major changes to update priorities

**Tip:** Focus on CRITICAL and HIGH priority items first!
`

// Save report
const outputFile = 'REVIEW_PRIORITIES.md'
fs.writeFileSync(outputFile, markdown)

console.log(`\n✅ Generated ${outputFile}`)
console.log(`\n📊 Summary:`)
console.log(`  Total modules analyzed: ${priorities.length}`)
if (top20.length > 0) {
  console.log(`  Top priority: ${top20[0].path} (score: ${top20[0].score})`)
  console.log(
    `  Circular dependencies found: ${priorities.filter((p) => p.metrics.hasCircular).length}`
  )
  console.log(`\n🎯 Review the top 20 modules in priority order!`)
} else {
  console.log(`\n⚠️  No modules found. Run setup first to generate dependency metrics.`)
}
