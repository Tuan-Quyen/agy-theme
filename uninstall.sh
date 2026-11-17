#!/usr/bin/env bash
# ============================================================================
# Antigravity Custom Theme - 1-Click Uninstaller
# Tắt daemon, gỡ LaunchAgent, xóa injection, khôi phục UI gốc
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_TARGET="$HOME/.gemini/config/skills/agy-theme"
LEGACY_SKILL_TARGET="$HOME/.gemini/config/skills/antigravity-custom-theme"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${RED}============================================================${NC}"
echo -e "${RED}       Antigravity Custom Theme - Uninstaller               ${NC}"
echo -e "${RED}============================================================${NC}"

# 1. Chạy kịch bản gỡ bỏ qua CDP
echo -e "${YELLOW}[1/3] Gỡ bỏ theme khỏi Antigravity và dừng daemon...${NC}"
node "$SCRIPT_DIR/scripts/uninstall.js"

# 2. Xóa symlink skill nếu có
echo -e "${YELLOW}[2/3] Gỡ bỏ liên kết Agent Skill...${NC}"
rm -f "$SKILL_TARGET" "$LEGACY_SKILL_TARGET"
echo -e "${GREEN}      -> Đã gỡ symlink skill${NC}"

# 3. Dọn dẹp PID và file tạm
echo -e "${YELLOW}[3/3] Dọn dẹp trạng thái...${NC}"
rm -f "$SCRIPT_DIR/daemon.pid" "$SCRIPT_DIR/daemon.log"

echo ""
echo -e "${GREEN}============================================================${NC}"
echo -e "${GREEN}   ĐÃ GỠ BỎ HOÀN TẤT! GIAO DIỆN ĐÃ TRỞ VỀ MẶC ĐỊNH GỐC.     ${NC}"
echo -e "${GREEN}============================================================${NC}"
