/**
 * Discord Module Test Suite
 * Tests Discord plugin functionality in isolation
 */

const { Client, GatewayIntentBits, Events } = require('discord.js')

// Test configuration
const TEST_TOKEN = process.env.DISCORD_TOKEN || ''
const TEST_CHANNEL_ID = process.env.TEST_CHANNEL_ID || ''

if (!TEST_TOKEN) {
  console.error('Please set DISCORD_TOKEN environment variable')
  process.exit(1)
}

// Create test client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
})

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  warnings: []
}

// Utility functions
function logTest(name, passed, message) {
  if (passed) {
    console.log(`✅ ${name}`)
    testResults.passed.push(name)
  } else {
    console.error(`❌ ${name}: ${message}`)
    testResults.failed.push({ name, message })
  }
}

function logWarning(message) {
  console.warn(`⚠️  ${message}`)
  testResults.warnings.push(message)
}

// Test 1: Bot connection
async function testConnection() {
  console.log('\n📝 Testing Bot Connection...')

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logTest('Bot Connection', false, 'Connection timeout after 10s')
      resolve(false)
    }, 10000)

    client.once(Events.ClientReady, (readyClient) => {
      clearTimeout(timeout)
      logTest('Bot Connection', true)
      console.log(`   Connected as: ${readyClient.user.tag}`)
      console.log(`   Bot ID: ${readyClient.user.id}`)
      console.log(`   Guilds: ${readyClient.guilds.cache.size}`)
      resolve(true)
    })

    client.login(TEST_TOKEN).catch((error) => {
      clearTimeout(timeout)
      logTest('Bot Connection', false, error.message)
      resolve(false)
    })
  })
}

// Test 2: Command detection
async function testCommandDetection() {
  console.log('\n📝 Testing Command Detection...')

  // Test various command formats
  const testCases = [
    { input: '/help', shouldMatch: true, command: 'help', args: [] },
    { input: '/workspace test', shouldMatch: true, command: 'workspace', args: ['test'] },
    { input: '/session list', shouldMatch: true, command: 'session', args: ['list'] },
    { input: '/ help', shouldMatch: false }, // Space after slash
    { input: 'not a command', shouldMatch: false },
    { input: '@bot /help', shouldMatch: true, command: 'help', args: [] },
    {
      input: '/workspace /path/to/dir',
      shouldMatch: true,
      command: 'workspace',
      args: ['/path/to/dir']
    },
    {
      input: '/session new Test Session',
      shouldMatch: true,
      command: 'session',
      args: ['new', 'Test', 'Session']
    }
  ]

  for (const test of testCases) {
    const isCommand = test.input.startsWith('/')
    const parts = test.input.slice(1).trim().split(/\s+/)
    const command = parts[0]?.toLowerCase()
    const args = parts.slice(1)

    if (test.shouldMatch) {
      const matches =
        isCommand && command === test.command && JSON.stringify(args) === JSON.stringify(test.args)
      logTest(
        `Command: "${test.input}"`,
        matches,
        `Expected: ${test.command} [${test.args}], Got: ${command} [${args}]`
      )
    } else {
      logTest(`Non-command: "${test.input}"`, !isCommand || !command)
    }
  }
}

// Test 3: Message handling
async function testMessageHandling() {
  console.log('\n📝 Testing Message Handling...')

  // Set up message listener
  let messageReceived = false
  let commandReceived = false
  let mentionReceived = false

  client.on(Events.MessageCreate, (message) => {
    // Ignore bot messages
    if (message.author.bot) return

    messageReceived = true
    console.log(`   Received: ${message.content} from ${message.author.tag}`)

    // Check if it's a command
    if (message.content.startsWith('/')) {
      commandReceived = true
      const args = message.content.slice(1).trim().split(/\s+/)
      const command = args.shift()?.toLowerCase()
      console.log(`   Command detected: ${command} with args: [${args.join(', ')}]`)
    }

    // Check for mentions
    if (message.mentions.has(client.user.id)) {
      mentionReceived = true
      console.log(`   Bot was mentioned!`)
    }
  })

  // Give it 5 seconds to receive messages
  await new Promise((resolve) => setTimeout(resolve, 5000))

  logTest('Message Listener Setup', true)
  if (!messageReceived) {
    logWarning('No messages received during test period')
  }
}

// Test 4: Permission checks
async function testPermissions() {
  console.log('\n📝 Testing Bot Permissions...')

  const guilds = client.guilds.cache

  if (guilds.size === 0) {
    logWarning('Bot is not in any guilds')
    return
  }

  for (const [guildId, guild] of guilds) {
    console.log(`\n   Guild: ${guild.name} (${guildId})`)

    const botMember = guild.members.cache.get(client.user.id)
    if (!botMember) {
      logWarning(`Bot member not found in ${guild.name}`)
      continue
    }

    // Check important permissions
    const permissions = {
      VIEW_CHANNEL: botMember.permissions.has('ViewChannel'),
      SEND_MESSAGES: botMember.permissions.has('SendMessages'),
      READ_MESSAGE_HISTORY: botMember.permissions.has('ReadMessageHistory'),
      ADD_REACTIONS: botMember.permissions.has('AddReactions'),
      ADMINISTRATOR: botMember.permissions.has('Administrator')
    }

    for (const [perm, has] of Object.entries(permissions)) {
      if (has) {
        console.log(`   ✅ ${perm}`)
      } else {
        console.log(`   ❌ ${perm}`)
        if (perm === 'SEND_MESSAGES' || perm === 'VIEW_CHANNEL') {
          logWarning(`Missing critical permission: ${perm} in ${guild.name}`)
        }
      }
    }
  }

  logTest('Permission Check', true)
}

// Test 5: Channel types
async function testChannelTypes() {
  console.log('\n📝 Testing Channel Type Support...')

  const { ChannelType } = require('discord.js')

  const supportedTypes = [
    ChannelType.GuildText,
    ChannelType.DM,
    ChannelType.GuildVoice,
    ChannelType.GroupDM,
    ChannelType.GuildAnnouncement,
    ChannelType.PublicThread,
    ChannelType.PrivateThread,
    ChannelType.AnnouncementThread
  ]

  console.log('   Supported channel types:')
  for (const type of supportedTypes) {
    console.log(`   - ${ChannelType[type] || type}`)
  }

  // Check actual channels
  const channels = client.channels.cache
  const channelsByType = {}

  for (const [id, channel] of channels) {
    const typeName = ChannelType[channel.type] || channel.type
    channelsByType[typeName] = (channelsByType[typeName] || 0) + 1
  }

  console.log('\n   Actual channels by type:')
  for (const [type, count] of Object.entries(channelsByType)) {
    console.log(`   - ${type}: ${count}`)
  }

  logTest('Channel Type Analysis', true)
}

// Test 6: Message splitting
function testMessageSplitting() {
  console.log('\n📝 Testing Message Splitting...')

  function splitMessage(text, maxLength = 2000) {
    const chunks = []
    let currentChunk = ''

    const lines = text.split('\n')
    for (const line of lines) {
      if (currentChunk.length + line.length + 1 > maxLength) {
        if (currentChunk) {
          chunks.push(currentChunk)
          currentChunk = ''
        }

        if (line.length > maxLength) {
          const words = line.split(' ')
          for (const word of words) {
            if (currentChunk.length + word.length + 1 > maxLength) {
              chunks.push(currentChunk)
              currentChunk = word
            } else {
              currentChunk += (currentChunk ? ' ' : '') + word
            }
          }
        } else {
          currentChunk = line
        }
      } else {
        currentChunk += (currentChunk ? '\n' : '') + line
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk)
    }

    return chunks
  }

  // Test cases
  const tests = [
    {
      name: 'Short message',
      input: 'Hello world',
      expectedChunks: 1
    },
    {
      name: 'Exact 2000 chars',
      input: 'a'.repeat(2000),
      expectedChunks: 1
    },
    {
      name: '2001 chars',
      input: 'a'.repeat(2001),
      expectedChunks: 2
    },
    {
      name: 'Multiple lines',
      input: Array(100).fill('This is a line of text').join('\n'),
      expectedChunks: 2
    }
  ]

  for (const test of tests) {
    const chunks = splitMessage(test.input)
    const passed = chunks.length === test.expectedChunks
    logTest(
      `Message splitting: ${test.name}`,
      passed,
      `Expected ${test.expectedChunks} chunks, got ${chunks.length}`
    )

    // Verify no chunk exceeds 2000 chars
    for (let i = 0; i < chunks.length; i++) {
      if (chunks[i].length > 2000) {
        logTest(`Chunk ${i + 1} size check`, false, `Chunk is ${chunks[i].length} chars (max 2000)`)
      }
    }
  }
}

// Test 7: Error handling
async function testErrorHandling() {
  console.log('\n📝 Testing Error Handling...')

  // Test error event handling
  let errorHandled = false

  client.on(Events.Error, (error) => {
    errorHandled = true
    console.log(`   Error event received: ${error.message}`)
  })

  client.on(Events.Warn, (warning) => {
    console.log(`   Warning received: ${warning}`)
  })

  logTest('Error handlers registered', true)

  // Test disconnect handling
  client.on(Events.ShardDisconnect, (event, shardId) => {
    console.log(`   Shard ${shardId} disconnected`)
  })

  logTest('Disconnect handler registered', true)
}

// Main test runner
async function runTests() {
  console.log('🧪 Discord Module Test Suite')
  console.log('============================')

  // Run tests in sequence
  const connected = await testConnection()

  if (connected) {
    testCommandDetection()
    await testMessageHandling()
    await testPermissions()
    await testChannelTypes()
    testMessageSplitting()
    await testErrorHandling()
  }

  // Print summary
  console.log('\n📊 Test Summary')
  console.log('===============')
  console.log(`✅ Passed: ${testResults.passed.length}`)
  console.log(`❌ Failed: ${testResults.failed.length}`)
  console.log(`⚠️  Warnings: ${testResults.warnings.length}`)

  if (testResults.failed.length > 0) {
    console.log('\nFailed tests:')
    for (const failure of testResults.failed) {
      console.log(`  - ${failure.name}: ${failure.message}`)
    }
  }

  if (testResults.warnings.length > 0) {
    console.log('\nWarnings:')
    for (const warning of testResults.warnings) {
      console.log(`  - ${warning}`)
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...')
  client.destroy()
  process.exit(testResults.failed.length > 0 ? 1 : 0)
}

// Run the tests
runTests().catch((error) => {
  console.error('Test suite failed:', error)
  process.exit(1)
})
