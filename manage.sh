#!/usr/bin/env bash
# ============================================================================
# Antigravity Custom Theme - Management Console
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

clear || true
echo -e "${MAGENTA}${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}${BOLD}║           ANTIGRAVITY CUSTOM THEME MANAGER               ║${NC}"
echo -e "${MAGENTA}${BOLD}║        (Non-invasive CDP • Zero asar modification)       ║${NC}"
echo -e "${MAGENTA}${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Thư mục dự án: ${CYAN}$SCRIPT_DIR${NC}"
echo ""
echo -e "  ${BOLD}[1]${NC} ${GREEN}Cài đặt & Kích hoạt Theme Daemon${NC} (Auto-start on boot)"
echo -e "  ${BOLD}[2]${NC} ${CYAN}Kiểm tra trạng thái Theme (Verify CDP)${NC}"
echo -e "  ${BOLD}[3]${NC} ${YELLOW}Biên dịch lại Payload (Rebuild themes.json/assets)${NC}"
echo -e "  ${BOLD}[4]${NC} ${RED}Gỡ bỏ hoàn toàn (Uninstall & Restore default UI)${NC}"
echo -e "  ${BOLD}[5]${NC} Thoát"
echo ""
read -r -p "Vui lòng chọn [1-5]: " choice

case "$choice" in
    1)
        bash "$SCRIPT_DIR/install.sh"
        ;;
    2)
        bash "$SCRIPT_DIR/status.sh"
        ;;
    3)
        echo -e "${YELLOW}Đang biên dịch lại themes & assets...${NC}"
        python3 "$SCRIPT_DIR/scripts/build_payload.py"
        echo -e "${GREEN}Biên dịch thành công! Daemon sẽ tự động nạp lại theme.${NC}"
        ;;
    4)
        bash "$SCRIPT_DIR/uninstall.sh"
        ;;
    5)
        echo "Tạm biệt!"
        exit 0
        ;;
    *)
        echo -e "${RED}Lựa chọn không hợp lệ.${NC}"
        exit 1
        ;;
esac
