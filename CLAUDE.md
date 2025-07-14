# CLAUDE.md - W.E.R.O.N.I.C.A Documentation

**W.E.R.O.N.I.C.A** - Working Everyday Reliable & Open-minded, Never entitled, Intelligent Creative Assistant

*Working hard, never whining, always designing. Design flow in tempo. No chaos. No fuss.*

## Project Overview

W.E.R.O.N.I.C.A is a Model Context Protocol (MCP) integration that enables bidirectional communication between Claude Code/Gemini CLI and Figma. Unlike the default Figma MCP which only works in read-only mode for developers, this solution allows **direct manipulation of Figma projects** through a WebSocket bridge.

## Architecture

### Core Components

1. **MCP Server** (`src/talk_to_figma_mcp/server.ts`)
   - TypeScript-based MCP server implementing 40+ Figma tools
   - Communicates with WebSocket server as a client
   - Handles command routing and response formatting
   - Built with `@modelcontextprotocol/sdk`
   - Compiled to `dist/server.js` using tsup

2. **WebSocket Server** (`src/socket.ts`)
   - Bun-based WebSocket broker running on port 3055
   - Manages channel-based communication
   - Stores channel metadata (document name, connection time, client count)
   - Handles multi-client synchronization
   - Supports `join`, `message`, and `list_channels` operations

3. **Figma Plugin** (`src/cursor_mcp_plugin/`)
   - **UI** (`ui.html`): 560x650px widget with 3 tabs
   - **Logic** (`code.js`): Figma API command handler
   - **Translation** (`translation.js`): UI logic and WebSocket client
   - **Manifest** (`manifest.json`): Plugin configuration

### Communication Flow

```
Claude Code/Gemini CLI → MCP Server → WebSocket Server ← Figma Plugin ← Figma Document
                          (client)      (broker:3055)     (client)       (API)
```

## Figma Plugin UI Structure

### Three Main Tabs

1. **Połączenie (Connection)**
   - WebSocket port configuration (default: 3055)
   - Connect/Disconnect buttons with visual states
   - Real-time connection status:
     - 🔴 Rozłączony (Disconnected) - red indicator
     - 🟡 Łączenie... (Connecting) - yellow indicator  
     - 🟢 Połączony (Connected) - green indicator
   - Displays channel ID and document name when connected
   - Auto-generates unique channel ID per document

2. **Aktywne Sesje (Active Sessions)**
   - Lists all active connections across all channels
   - Connection info for each session:
     - Channel ID (unique per document)
     - Document name
     - Connection timestamp
     - Number of clients connected
   - Highlights current user's connection with (You) indicator
   - Auto-refreshes every 2 seconds when visible
   - Manual refresh button "Odśwież połączenia"
   - **"Dane dla LLM" (Data for LLM)** section:
     - Auto-generates markdown-formatted connection data
     - One-click copy button "Kopiuj dane"
     - Includes ready-to-use command: `join_channel channel:"[ID]"`
     - Updates dynamically when connection changes

3. **O narzędziu (About Tool)**
   - Plugin title: W.E.R.O.N.I.C.A
   - Version information
   - 4-step usage instructions:
     1. Start WebSocket server (`bun socket`)
     2. Connect plugin to server (Połącz button)
     3. Copy channel ID from Aktywne Sesje
     4. Use `join_channel` in Claude Code
   - Explains the 1 project = 1 channel ID concept
   - Links to documentation

### UI Features

- **Bilingual Support**: Polish/English language toggle
- **Real-time Updates**: Connection status and active sessions refresh
- **Progress Tracking**: Visual progress bar for bulk operations
- **Copy Integration**: One-click copy for LLM data and channel IDs

## Key Technologies

### Why Bun/Bunx Instead of NPM?

1. **Performance**: Bun is 4-100x faster than npm for:
   - Package installation (4x faster)
   - Script execution (30x faster for startup)
   - WebSocket handling (native implementation)
   - TypeScript transpilation (no separate step needed)

2. **Native TypeScript**: 
   - Direct `.ts` file execution without compilation
   - Built-in transpiler faster than tsc
   - No need for ts-node or nodemon

3. **Built-in WebSocket**: 
   - Native WebSocket server implementation
   - Better performance than ws package
   - Simpler API with less boilerplate

4. **Single Runtime**: 
   - One tool for package management, running, building
   - `bunx` executes packages without installation
   - Replaces npm, npx, node, and build tools

5. **Developer Experience**:
   - Hot reload without configuration
   - Better error messages
   - Smaller node_modules size
   - Compatible with npm packages

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest",  // MCP protocol implementation
    "uuid": "latest",                      // Unique ID generation
    "ws": "latest",                        // WebSocket client for MCP server
    "zod": "latest"                        // Schema validation
  },
  "devDependencies": {
    "@types/bun": "latest",
    "bun-types": "^1.2.5",
    "tsup": "^8.4.0",                    // TypeScript bundler
    "typescript": "^5.0.0"
  }
}
```

## Logic Flow and Dependencies

### Message Flow Sequence

1. **User Action in Claude Code**:
   ```
   User → Claude Code → MCP Tool Call → MCP Server
   ```

2. **WebSocket Communication**:
   ```
   MCP Server → WebSocket Client → WebSocket Server (3055) → Figma Plugin
   ```

3. **Figma Execution**:
   ```
   Figma Plugin → Figma API → Document Manipulation → Response
   ```

4. **Response Path**:
   ```
   Figma Result → Plugin → WebSocket → MCP Server → Claude Code → User
   ```

### Dependency Map

```
weronica-mcp/
├── MCP Server (dist/server.js)
│   ├── @modelcontextprotocol/sdk (MCP protocol)
│   ├── ws (WebSocket client)
│   ├── zod (parameter validation)
│   └── uuid (request ID generation)
│
├── WebSocket Server (socket.ts)
│   └── Bun.serve() (native Bun WebSocket)
│
└── Figma Plugin
    ├── code.js (depends on Figma API)
    ├── ui.html (UI structure)
    └── translation.js (UI logic, WebSocket client)
```

### State Management

1. **MCP Server State**:
   - `pendingRequests`: Map of request ID → promise resolver
   - `ws`: WebSocket connection instance
   - `currentChannel`: Active channel ID

2. **WebSocket Server State**:
   - `channels`: Map of channel ID → Set of clients
   - `channelMetadata`: Map of channel ID → metadata object

3. **Figma Plugin State**:
   - `state.connected`: Connection status
   - `state.socket`: WebSocket instance
   - `state.channel`: Current channel ID
   - `state.documentName`: Current document name
   - `state.pendingRequests`: Command queue

## Key Methods and Functions

### WebSocket Server (`socket.ts`)

- `handleConnection()`: Manages new WebSocket connections
- `channels`: Map storing clients by channel
- `channelMetadata`: Map storing channel information
- Message types: `join`, `message`, `list_channels`

### Figma Plugin (`code.js`)

- `handleCommand()`: Main command router for 40+ Figma operations
- `sendProgressUpdate()`: Progress tracking for bulk operations
- Command categories:
  - Document & Selection reading
  - Node creation and manipulation
  - Text content management
  - Component and style handling
  - Annotation system
  - Prototyping and connections
  - Export functionality

### Translation Layer (`translation.js`)

- `connectToServer()`: WebSocket connection management
- `sendCommand()`: Command routing to Figma
- `updateConnectionsList()`: Active sessions display
- `generateLLMData()`: Markdown formatter for AI assistants
- `translations`: Bilingual UI text management
- `showTab()`: Tab switching logic
- `updateProgressBar()`: Visual progress tracking
- `copyToClipboard()`: Copy functionality with visual feedback

### Visual Elements and User Feedback

1. **Progress Bar**:
   - Shows during bulk operations
   - Updates in real-time via WebSocket
   - Format: "Processing X of Y items..."
   - Auto-hides on completion

2. **Connection Status Indicators**:
   - Red dot + "Rozłączony" (Disconnected)
   - Yellow dot + "Łączenie..." (Connecting)
   - Green dot + "Połączony" (Connected)

3. **Copy Feedback**:
   - Button text changes to "✓ Skopiowano!" on success
   - Reverts after 2 seconds
   - Works for both channel ID and LLM data

4. **Active Session Highlighting**:
   - Current connection marked with "(Ty)"/"(You)"
   - Different background color for own session
   - Timestamp shows relative time

## MCP Tools Overview

### Document & Selection (5 tools)
- Read document info, selection, and node details

### Annotations (4 tools)
- Native Figma annotations with markdown support

### Prototyping (3 tools)
- Reactions and FigJam connector management

### Creation (3 tools)
- Rectangles, frames, and text nodes

### Text Management (3 tools)
- Scan and batch update text content

### Auto Layout (6 tools)
- Complete auto-layout configuration

### Styling (3 tools)
- Colors, strokes, and corner radius

### Layout (5 tools)
- Move, resize, delete, and clone operations

### Components (5 tools)
- Styles, components, and instance overrides

### Export (1 tool)
- Image export with format options

### Connection (1 tool)
- Channel management for WebSocket communication

## Installation and Setup

### Quick Start

1. **Install Bun** (if not already installed):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Run Setup**:
   ```bash
   bun setup
   ```
   This will:
   - Install dependencies
   - Configure MCP in Claude Code
   - Create necessary directories

3. **Start Services**:
   ```bash
   ./start-all.sh  # Starts both WebSocket and MCP servers
   ```
   Or manually:
   ```bash
   bun socket  # Terminal 1: WebSocket server
   bunx claude-talk-to-figma-mcp  # Terminal 2: MCP server
   ```

4. **Install Figma Plugin**:
   - In Figma: Plugins → Development → New Plugin
   - Choose "Link existing plugin"
   - Select `src/cursor_mcp_plugin/manifest.json`

### Windows WSL Setup

1. Install Bun via PowerShell:
   ```bash
   powershell -c "irm bun.sh/install.ps1|iex"
   ```

2. Edit `src/socket.ts` and uncomment:
   ```typescript
   hostname: "0.0.0.0",
   ```

3. Start the WebSocket server:
   ```bash
   bun socket
   ```

## Usage Workflow

1. **Start Infrastructure**:
   - Run `./start-all.sh` to start both servers
   - Verify WebSocket is running: `lsof -i :3055`

2. **Connect Figma**:
   - Open your Figma document
   - Run W.E.R.O.N.I.C.A plugin
   - Click "Połącz" (Connect) - uses port 3055
   - Note the generated channel ID

3. **Connect AI Assistant**:
   - In Claude Code/Gemini CLI, use:
   ```
   join_channel channel:"abc12345"  # Your channel ID
   ```

4. **Work with Figma**:
   - Use any of the 40+ MCP tools
   - Monitor progress in plugin UI
   - Check "Aktywne Sesje" for all connections

## Best Practices

### Connection Management
1. Always join a channel before sending commands
2. One project = One channel ID
3. Use "Dane dla LLM" tab to share context with AI

### Command Execution
1. Start with `get_document_info` for overview
2. Use `get_selection` before modifications
3. Verify changes with `get_node_info`

### Performance Optimization
1. Use batch operations (`set_multiple_*`) when possible
2. Enable chunking for large designs in `scan_text_nodes`
3. Monitor progress through WebSocket updates

### Error Handling
1. All commands can throw exceptions - handle appropriately
2. Check connection status before operations
3. Restart WebSocket server if connections fail

### Design Operations
1. **Creating Elements**:
   - `create_frame` for containers
   - `create_rectangle` for shapes
   - `create_text` for text

2. **Text Operations**:
   - Scan first, then batch update
   - Consider structural relationships
   - Verify with targeted exports

3. **Component Management**:
   - Use instances for consistency
   - Extract overrides from source
   - Apply to targets in batch

4. **Annotations**:
   - Convert legacy text annotations to native
   - Use markdown formatting
   - Batch create with `set_multiple_annotations`

5. **Prototyping**:
   - Extract flows with `get_reactions`
   - Set default connector style
   - Create visual connections

## Troubleshooting

### Connection Issues

1. **Port 3055 Already in Use**:
   ```bash
   lsof -i :3055  # Check what's using the port
   kill -9 <PID>  # Kill the process if needed
   ```

2. **WebSocket Connection Failed**:
   - Ensure WebSocket server is running
   - Check firewall settings
   - For WSL: Use `hostname: "0.0.0.0"`

3. **MCP Server Not Found**:
   - Run `bun setup` to configure
   - Check `~/.claude/mcp.json` exists
   - Restart Claude Code

4. **Plugin Not Loading**:
   - Verify manifest.json path
   - Check console for errors (Plugins → Development → Open Console)
   - Ensure you're in development mode

### Active Sessions Not Showing

If "Aktywne Sesje" tab shows no connections:
1. Restart WebSocket server with latest code
2. Ensure metadata is being sent on join
3. Click "Odśwież" (Refresh) button
4. Check WebSocket server console for errors

### Performance Issues

1. **Slow Operations**:
   - Use batch operations
   - Enable chunking for large scans
   - Monitor progress in UI

2. **Memory Issues**:
   - Restart servers periodically
   - Clear pending requests map
   - Use smaller chunk sizes

## Development Notes

### File Structure
```
weronica-mcp/
├── src/
│   ├── talk_to_figma_mcp/
│   │   ├── server.ts         # MCP server implementation
│   │   ├── package.json      # Server-specific deps
│   │   └── tsconfig.json     # TypeScript config
│   ├── cursor_mcp_plugin/
│   │   ├── manifest.json     # Figma plugin manifest
│   │   ├── code.js          # Figma API handlers
│   │   ├── ui.html          # Plugin UI (560x650)
│   │   ├── translation.js   # UI logic & i18n
│   │   └── setcharacters.js # Text manipulation
│   └── socket.ts            # WebSocket broker
├── dist/                    # Compiled output
├── docs/                    # Documentation
├── scripts/
│   └── setup.sh            # Installation script
├── package.json            # Main dependencies
├── tsup.config.ts         # Build configuration
├── start-all.sh           # Service launcher
└── readme.md              # Public documentation
```

### Building from Source

1. **Build MCP Server**:
   ```bash
   bun run build  # Creates dist/server.js
   ```

2. **Watch Mode**:
   ```bash
   bun run dev  # Auto-rebuild on changes
   ```

3. **Publish to NPM**:
   ```bash
   bun run pub:release
   ```

### Adding New MCP Tools

1. Add tool definition in `server.ts`:
   ```typescript
   server.tool(
     "tool_name",
     "Tool description",
     { /* zod schema */ },
     async (params) => { /* implementation */ }
   );
   ```

2. Add handler in `code.js`:
   ```javascript
   case "tool_name":
     // Figma API implementation
     break;
   ```

3. Update documentation in `readme.md`

## Version History

- **v0.2.1**: Current version with 40+ tools
- Added LLM data export feature
- Improved active sessions tracking
- Enhanced progress tracking for bulk operations
- Bilingual UI support (Polish/English)

## Credits

Based on the original [Cursor Talk to Figma MCP](https://github.com/sonnylazuardi/cursor-talk-to-figma-mcp) by Sonny Lazuardi.

Contributors:
- Alex M. - Project maintainer
- [@dusskapark](https://github.com/dusskapark) - Bulk text replacement & instance overrides