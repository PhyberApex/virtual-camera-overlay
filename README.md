# Virtual Camera Overlay

A Vue.js-based overlay for displaying fitness tracking data from Home Assistant in OBS Studio.

## Overview

This application connects to a Home Assistant instance via WebSockets and displays real-time step count and speed data from a fitness device. It's specifically designed to be used as a browser source in OBS Studio to enhance stream visuals overlay over your camera.

## Features

- **Real-time Data**: Connects to Home Assistant via WebSockets for instant updates
- **Responsive Design**: Looks good at any resolution using Tailwind CSS
- **Status Indicator**: Shows connection status with color coding
- **OBS Compatible**: Designed to work as a browser source in OBS Studio
- **Configurable**: Easily customize connection settings via environment variables

## Setup

### Prerequisites

- Node.js 16+ and npm
- Home Assistant instance with long-lived access token
- OBS Studio (for streaming/recording)

### Installation

1. Clone this repository:

   ```bash
   git clone https://github.com/yourusername/fitness-tracker-overlay.git
   cd fitness-tracker-overlay
   ```

2. Install dependencies:

   ```bash
   npm install
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
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

### OBS Studio Integration

1. In OBS Studio, add a new "Browser" source
2. For local development:
   - Use the URL provided by the Vite dev server (typically http://localhost:5173/)
3. For production:

   - Host the built files on a web server and use that URL
   - Or use the "Local File" option and point to the index.html in your dist folder

4. Set the width and height to match your stream layout (recommend using your full canvas size)
5. **Important**: Make sure to check "Enable transparency" in the Browser Source properties
6. Remove any custom CSS that OBS might add by default

**Tip**: If you're still seeing a background or the overlay isn't transparent, add this in the Custom CSS field in OBS:

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
| `VITE_HA_PORT`     | Port for Home Assistant                | 8123         |

### Development Mode

When in development mode (`npm run dev`), you can:

**Development Panel**: A control panel will appear in the top-left corner of the screen during development. It allows you to:

- Toggle mock data on/off
- View the current connection status
- Monitor the current steps and speed values

This makes it easy to test and develop the overlay without needing a real fitness device or Home Assistant connection.

### Customizing Entities

If you need to track different entities, edit the `composables/useHomeAssistant.js` file and update the entity IDs in the `subscribeToEntities` function.

## Troubleshooting

- **Connection Issues**: Check that your Home Assistant instance is accessible and that your token is valid.
- **No Data Showing**: Verify that the entity IDs in the code match your Home Assistant entity IDs.
- **OBS Not Showing Updates**: Try adding a small custom CSS to the browser source: `body { background-color: rgba(0, 0, 0, 0.01); }`

## License

MIT License - See LICENSE file for details.

## Credits

- Built with [Vue.js](https://vuejs.org/) and [Vite](https://vitejs.dev/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
