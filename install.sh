#!/usr/bin/env bash
set -euo pipefail

# claude-code-hooks installer
# Usage:
#   Fresh install (git clone):  ./install.sh
#   From local path:            ./install.sh local:/path/to/hooks
#   Update existing:            ./install.sh update

HOOKS_REPO="https://github.com/jboothe/claude-code-hooks-ui.git"
HOOKS_DIR=".claude/hooks"
SETTINGS_FILE=".claude/settings.local.json"
TEMPLATE_FILE="$HOOKS_DIR/settings.template.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[hooks]${NC} $*"; }
ok()    { echo -e "${GREEN}[hooks]${NC} $*"; }
warn()  { echo -e "${YELLOW}[hooks]${NC} $*"; }
err()   { echo -e "${RED}[hooks]${NC} $*" >&2; }

# ─── Prerequisites ───────────────────────────────────────────────────────────

check_prerequisites() {
  local missing=0

  if ! command -v bun &>/dev/null; then
    err "bun is required but not installed. See https://bun.sh"
    missing=1
  fi

  if ! command -v git &>/dev/null; then
    err "git is required but not installed."
    missing=1
  fi

  if ! command -v jq &>/dev/null; then
    warn "jq not found — settings merge will use simple copy instead of smart merge."
    warn "Install jq for better results: https://jqlang.github.io/jq/download/"
  fi

  if [ "$missing" -ne 0 ]; then
    err "Missing prerequisites. Install them and try again."
    exit 1
  fi

  ok "Prerequisites OK (bun $(bun --version), git $(git --version | cut -d' ' -f3))"
}

# ─── Install hooks ───────────────────────────────────────────────────────────

install_hooks() {
  local mode="${1:-clone}"

  case "$mode" in
    update)
      if [ ! -d "$HOOKS_DIR/.git" ]; then
        err "$HOOKS_DIR is not a git repo. Use a fresh install instead."
        exit 1
      fi
      info "Updating hooks via git pull..."
      git -C "$HOOKS_DIR" pull --ff-only
      ;;

    local:*)
      local src="${mode#local:}"
      if [ ! -d "$src" ]; then
        err "Source directory not found: $src"
        exit 1
      fi
      info "Copying hooks from $src..."
      mkdir -p "$HOOKS_DIR"
      # Copy everything except node_modules, .git, and runtime artifacts
      rsync -a --exclude='node_modules' --exclude='.git' --exclude='logs' \
            --exclude='.claude/data' --exclude='.codemill' --exclude='.DS_Store' \
            --exclude='_archive_py' --exclude='utils' --exclude='.env' \
            "$src/" "$HOOKS_DIR/"
      ;;

    clone|*)
      if [ -d "$HOOKS_DIR" ]; then
        err "$HOOKS_DIR already exists. Use 'update' to pull latest, or remove it first."
        exit 1
      fi
      info "Cloning hooks repo..."
      mkdir -p .claude
      git clone "$HOOKS_REPO" "$HOOKS_DIR"
      ;;
  esac

  ok "Hooks installed at $HOOKS_DIR"
}

# ─── Install dependencies ────────────────────────────────────────────────────

install_deps() {
  info "Installing dependencies..."
  (cd "$HOOKS_DIR" && bun install)
  ok "Dependencies installed"
}

# ─── Merge settings ─────────────────────────────────────────────────────────

merge_settings() {
  if [ ! -f "$TEMPLATE_FILE" ]; then
    err "Template not found at $TEMPLATE_FILE — skipping settings merge."
    return
  fi

  mkdir -p .claude

  if [ ! -f "$SETTINGS_FILE" ]; then
    # No existing settings — just copy the template
    info "Creating $SETTINGS_FILE from template..."
    cp "$TEMPLATE_FILE" "$SETTINGS_FILE"
    ok "Settings created"
    return
  fi

  # Existing settings — merge hooks key
  if command -v jq &>/dev/null; then
    info "Merging hook registrations into existing $SETTINGS_FILE..."

    # Extract hooks from template
    local template_hooks
    template_hooks=$(jq '.hooks' "$TEMPLATE_FILE")

    # Merge: existing settings + template hooks (existing hooks take precedence)
    local merged
    merged=$(jq --argjson new_hooks "$template_hooks" '
      .hooks = (($new_hooks // {}) * (.hooks // {}))
    ' "$SETTINGS_FILE")

    echo "$merged" | jq '.' > "$SETTINGS_FILE.tmp"
    mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
    ok "Hook registrations merged (existing settings preserved)"
  else
    warn "jq not available — cannot smart-merge settings."
    warn "Template saved to $TEMPLATE_FILE"
    warn "Manually copy the \"hooks\" key from settings.template.json into $SETTINGS_FILE"
  fi
}

# ─── Remind about .env ──────────────────────────────────────────────────────

remind_env() {
  echo ""
  info "Optional API keys (add to project root .env or export in shell):"
  echo "  ANTHROPIC_API_KEY     — LLM summarization (Anthropic)"
  echo "  OPENAI_API_KEY        — LLM summarization (OpenAI) / TTS (OpenAI)"
  echo "  ELEVENLABS_API_KEY    — TTS (ElevenLabs)"
  echo "  UNREAL_SPEECH_API_KEY — TTS (Unreal Speech)"
  echo ""
  warn "The installer does NOT create or modify .env files — secrets stay project-specific."
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   claude-code-hooks installer v1.0   ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
  echo ""

  check_prerequisites

  local mode="${1:-clone}"
  install_hooks "$mode"
  install_deps
  merge_settings
  remind_env

  echo ""
  ok "Installation complete!"
  info "Start a new Claude Code session to activate hooks."
  info "Run 'bun run tts-app' from $HOOKS_DIR to start the Claude Code Hooks Manager (localhost:3455)."
  echo ""
}

main "$@"
