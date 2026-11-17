#!/usr/bin/env bash
# ============================================================================
# Antigravity Custom Theme - 1-Click Installer
# Không can thiệp binary hay app.asar - Sử dụng CDP Runtime Injection
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

echo -e "${CYAN}============================================================${NC}"
echo -e "${CYAN}       Antigravity Custom Theme - Installer (macOS)         ${NC}"
echo -e "${CYAN}============================================================${NC}"

# 1. Kiểm tra Python & Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Không tìm thấy Node.js. Cần Node.js >= 22.${NC}" >&2
    exit 1
fi

PY_BIN=""
if command -v python3 >/dev/null 2>&1; then
    PY_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PY_BIN="python"
else
    echo -e "${RED}[ERROR] Không tìm thấy Python 3 để biên dịch payload.${NC}" >&2
    exit 1
fi

# 2. Biên dịch Payload
echo -e "${YELLOW}[1/4] Đang biên dịch themes & assets vào dist/theme_payload.js...${NC}"
"$PY_BIN" "$SCRIPT_DIR/scripts/build_payload.py"

# 3. Đăng ký Agent Skill toàn cục
echo -e "${YELLOW}[2/4] Đăng ký Agent Skill vào ~/.gemini/config/skills/...${NC}"
mkdir -p "$HOME/.gemini/config/skills"
rm -rf "$SKILL_TARGET" "$LEGACY_SKILL_TARGET"
ln -s "$SCRIPT_DIR" "$SKILL_TARGET"
ln -s "agy-theme" "$LEGACY_SKILL_TARGET"
echo -e "${GREEN}      -> Đã tạo symlink skill: $SKILL_TARGET${NC}"

# 4. Cài đặt LaunchAgent Service
echo -e "${YELLOW}[3/4] Cài đặt background daemon (LaunchAgent)...${NC}"
bash "$SCRIPT_DIR/scripts/install-unix.sh"

# 5. Kiểm tra kết nối CDP
echo -e "${YELLOW}[4/4] Kiểm tra kết nối tới Antigravity qua CDP...${NC}"
sleep 1
if node "$SCRIPT_DIR/scripts/verify_cdp.js" >/dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}   CÀI ĐẶT THÀNH CÔNG! GIAO DIỆN ĐÃ ĐƯỢC ÁP DỤNG TRỰC TIẾP!  ${NC}"
    echo -e "${GREEN}============================================================${NC}"
    echo -e "Theme hiện tại: ${CYAN}Midnight Obsidian${NC} (Pure CSS Gradient • Zero-Image Ultra-Light)"
    echo -e "Nút tùy chỉnh: Xem biểu tượng Theme trên thanh Sidebar Antigravity."
else
    echo ""
    echo -e "${YELLOW}[LƯU Ý] Daemon đã chạy nhưng chưa thấy cửa sổ Antigravity mở.${NC}"
    echo -e "        Hãy khởi động Antigravity, theme sẽ tự động kích hoạt."
fi
