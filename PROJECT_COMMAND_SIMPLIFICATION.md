# Project Command Simplification

## Overview

Simplified the `/project` command to focus on just the essential functionality: **listing projects** and **adding projects** (stubbed for future implementation).

## Changes Made

### **Removed Subcommands:**
- **`/project current`** - Removed current project status checking
- **`/project switch`** - Removed manual project switching
- **`/project remove`** - Removed project removal functionality

### **Kept Subcommands:**
- **`/project list`** - Shows all Discord project channels and discovered Toji projects
- **`/project add`** - Stubbed implementation for future development

## Current Functionality

### **`/project list`**
- **Purpose**: Display all available projects
- **Shows**:
  - Discord project channels with active indicators (🟢/⚪)
  - Project paths and channel links
  - Count of Discord channels vs discovered projects
- **Fully Functional**: ✅ Works as before

### **`/project add` (Stubbed)**
- **Purpose**: Will add new projects in the future
- **Current Behavior**: Shows "Coming Soon" message with requested parameters
- **Parameters**:
  - `path` (required) - Absolute path to project directory
  - `name` (optional) - Custom name for the project
- **Status**: 🚧 Stubbed for future implementation

## Rationale for Simplification

### **Why Remove These Commands?**

1. **`/project current`** - Redundant with `/project list` which shows active indicators
2. **`/project switch`** - Project switching happens automatically when users type in channels
3. **`/project remove`** - Can cause confusion and data loss; `/init` rebuilds everything cleanly

### **Back to Basics Approach:**
- **Primary workflow**: Use `/init` to rebuild all channels from discovered projects
- **Information**: Use `/project list` to see what's available
- **Future expansion**: `/project add` will handle manual additions when properly implemented

## Updated Help Documentation

The help command now shows:
```
📂 /project [subcommand]
Project management (list, add - coming soon)
```

## Implementation Details

### **Stub Implementation:**
```typescript
async function handleAdd(interaction, _projectManager) {
  // Shows coming soon message with requested parameters
  // Guides users to use /init for now
}
```

### **Clean Code:**
- Removed all unused handler functions (`handleCurrent`, `handleSwitch`, `handleRemove`)
- Proper ESLint compliance with unused parameter handling
- Simplified command registration

## Current Discord Command Set

### **Essential Commands:**
1. **`/help`** - Show available commands
2. **`/init`** - Rebuild all channels from Toji projects
3. **`/clear`** - Clear conversation history
4. **`/project list`** - Show available projects
5. **`/project add`** - Coming soon (stubbed)

### **Automatic Features:**
- **Chat via @mention** - Works in any channel
- **Auto project switching** - When typing in project channels
- **Channel discovery** - `/init` finds all Toji projects

## Benefits

### 🎯 **Focused Functionality**
- Clear separation: `/init` for setup, `/project list` for information
- Reduced complexity and potential user confusion
- Better foundation for future feature development

### 🧹 **Cleaner Codebase**
- Removed 100+ lines of complex switching/removal logic
- Easier to maintain and extend
- Clear stub pattern for future development

### 🚀 **Better User Experience**
- Simpler command structure to learn
- Less chance of accidental project removal
- Clear path forward with "coming soon" messaging

This simplification creates a solid foundation for future development while keeping the essential functionality users need right now.
