# Toji3 Icon Assets

## New Branding (October 2025)

This directory contains the new Toji3 branding icons featuring the friendly green robot mascot.

### Icon Sizes

- `toji-icon-1024.png` - 1024x1024px - Primary icon source for builds
- `toji-icon-949.png` - 949x949px - Legacy size (kept for compatibility)
- `toji-icon-512.png` - 512x512px - Medium size
- `toji-icon-256.png` - 256x256px - Standard size
- `toji-icon-128.png` - 128x128px - Small size

### Usage

The `toji-icon-1024.png` is used as the primary icon source. Electron-builder automatically generates platform-specific formats:

- Windows: `.ico` files with multiple sizes
- macOS: `.icns` with multiple resolutions
- Linux: PNG files for AppImage/Snap/Deb

### Build Configuration

Icon is specified in `electron-builder.yml`:

```yaml
icon: build/icons/toji-icon-1024.png
```

### Runtime Assets

- `resources/toji.png` - Main application icon (1024x1024)
- `resources/toji_title.png` - Title bar icon (512x512)

### Old Assets

Previous branding has been moved to `old/` subdirectory for reference.

## Design

The Toji3 mascot is a friendly green robot with:

- Round head with antenna
- Large circular eyes
- Wide smile
- Round ear-like appendages

The design represents an approachable, helpful AI assistant.
