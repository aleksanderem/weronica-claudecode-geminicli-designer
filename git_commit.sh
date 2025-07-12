#!/bin/bash
cd /Users/alex/figma-project/cursor-talk-to-figma-mcp
git add src/cursor_mcp_plugin/ui.html docs/
git commit -F commit_msg.txt
git push -u origin main
rm commit_msg.txt
