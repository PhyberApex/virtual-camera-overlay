[![status-badge](https://woodpecker.phyberapex.de/api/badges/1/status.svg)](https://woodpecker.phyberapex.de/repos/1)

# Virtual Camera Overlay

A Vue.js-based overlay for displaying fitness tracking data from Home Assistant on your webcam during video meetings.

## Overview

This application connects to a Home Assistant instance via WebSockets and displays real-time fitness metrics (steps, speed, distance, heart rate) as a transparent overlay. It's designed to be used with OBS Studio's **virtual camera** feature in video conferencing apps (Zoom, Teams, Meet, etc.) so you can work out on a treadmill or exercise bike during meetings while showing colleagues you're actively engaged.

## Features

- **Real-time Data**: Connects to Home Assistant via WebSockets for instant fitness metrics
- **Meeting-Appropriate**: Visible enough to show activity, subtle enough not to distract
- **Widget System**: Modular display of steps, speed, distance, heart rate with color-coded zones
- **Virtual Camera Ready**: Designed to work as a browser source in OBS Studio's virtual camera
- **Transparent Background**: Renders only the overlay elements, no camera feed (use OBS to composite)
- **Configurable**: Easily customize connection settings via environment variables

## Setup

### Prerequisites

- Node.js 18+ and pnpm
- Home Assistant instance with long-lived access token
- OBS Studio (for virtual camera functionality)
- Video conferencing app (Zoom, Teams, Meet, etc.)

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/fitness-tracker-overlay.git
   cd fitness-tracker-overlay
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Configure environment variables:
   - Copy the example environment file:
     ```bash
     cp .env.example .env
     ```
   - Edit `.env` and add your Home Assistant access token and other configuration:
     ```
     VITE_HA_TOKEN=your_long_lived_access_token_here
     VITE_HA_DEV_HOST=192.168.0.13
     VITE_HA_PORT=8123
     ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

5. Build for production:
   ```bash
   pnpm build
   ```

### OBS Studio Virtual Camera Setup

This overlay is designed to be composited with your webcam feed in OBS, then output as a virtual camera to your video conferencing app.

1. **Add your webcam** as a "Video Capture Device" source in OBS
2. **Add the overlay** as a "Browser" source above your webcam:
   - For local development: use `http://localhost:5174/` (Vite dev server)
   - For production: host the built files on a web server or use "Local File" pointing to `dist/index.html`
3. Set the Browser source width and height to match your OBS canvas size (e.g., 1920x1080)
4. **Important**: Check "Enable transparency" in the Browser Source properties
5. **Start Virtual Camera** in OBS (Tools → Start Virtual Camera)
6. In your video conferencing app (Zoom/Teams/Meet), select "OBS Virtual Camera" as your camera source

**Tip**: If the overlay background isn't transparent, add this in the Browser source Custom CSS field:

```css
body {
  background-color: rgba(0, 0, 0, 0) !important;
  margin: 0px auto;
  overflow: hidden;
}
```

## Configuration

### Environment Variables

| Variable           | Description                            | Default      |
| ------------------ | -------------------------------------- | ------------ |
| `VITE_HA_TOKEN`    | Home Assistant long-lived access token | -            |
| `VITE_HA_DEV_HOST` | Host IP/domain for development         | 192.168.0.13 |
| `VITE_HA_DEV_PORT` | Dev server websocket port              | 8123         |
| `VITE_HA_PORT`     | Port for Home Assistant (prod)         | 8123         |

### Runtime token configuration

For production builds the overlay now reads `app-config.json` at runtime.
Create `public/app-config.json` (or copy `public/app-config.example.json`) with:

```json
{
  "haToken": "your_long_lived_access_token_here"
}
```

When deploying via Woodpecker the pipeline writes this file automatically using the `HA_TOKEN` secret.
If the file is missing, the overlay falls back to the compile-time `VITE_HA_TOKEN` env variable (useful for local dev).

### Development Mode

When in development mode (`pnpm dev`), a **Development Panel** appears (press `u` to toggle). It allows you to:

- Mock step and heart rate data without a real Home Assistant connection
- Manually control connection state
- Toggle special overlays (Be Right Back, Heart Rate visualization)
- Monitor current metric values

This makes it easy to test and develop the overlay without needing a running treadmill or Home Assistant instance.

### Customizing Entities

If you need to track different entities, edit the `composables/useHomeAssistant.ts` file and update the entity IDs in the `subscribeToEntities` function.

## Troubleshooting

- **Connection Issues**: Check that your Home Assistant instance is accessible and that your token is valid.
- **No Data Showing**: Verify that the entity IDs in the code match your Home Assistant entity IDs.
- **Virtual Camera Not Appearing**: Make sure OBS Virtual Camera is started (Tools → Start Virtual Camera).
- **Overlay Not Transparent in OBS**: Verify "Enable transparency" is checked in Browser source properties.
- **Video App Can't See OBS Camera**: Some apps require you to restart them after OBS Virtual Camera is started.

## License

MIT License - See LICENSE file for details.

## Credits

- Built with [Vue.js](https://vuejs.org/) and [Vite](https://vitejs.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
