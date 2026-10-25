#!/data/data/com.termux/files/usr/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🚀 Starting Node.js Server...${NC}"
node server.js &

# Node server ka PID save karein
SERVER_PID=$!

# Wait for 2 seconds to let the server start
sleep 2

# Check if server is still running (crashed or port in use)
if ! ps -p $SERVER_PID > /dev/null; then
    echo -e "${RED}❌ Server start nahi ho paya. Check errors above.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Server is running (PID: $SERVER_PID)${NC}"
echo -e "${YELLOW}🌐 Starting Cloudflare Tunnel...${NC}"

# Trap signal: Agar user Ctrl+C dabaye ya script band ho, toh server ko bhi band kar do
trap "echo -e '\n${RED}🛑 Stopping Server and Tunnel...${NC}'; kill $SERVER_PID; exit" INT TERM EXIT

# Cloudflare tunnel foreground mein chalayein
cloudflared tunnel --url http://localhost:5000 --protocol http2
