#!/bin/bash

# Create .claude directory if it doesn't exist
mkdir -p .claude

# Create .google directory for Gemini if it doesn't exist
mkdir -p .google

bun install

# Create mcp.json for Claude Code
echo "{
  \"mcpServers\": {
    \"TalkToFigma\": {
      \"command\": \"bunx\",
      \"args\": [
        \"claude-talk-to-figma-mcp@latest\"
      ]
    }
  }
}" > .claude/mcp.json 

# Create mcp.json for Gemini  
echo "{
  \"mcpServers\": {
    \"TalkToFigma\": {
      \"command\": \"bunx\",
      \"args\": [
        \"claude-talk-to-figma-mcp@latest\"
      ]
    }
  }
}" > .google/mcp.json

# Run setup, this will also install MCP in active project
bun setup
# Start the Websocket server
bun socket
# MCP server
bunx claude-talk-to-figma-mcp 