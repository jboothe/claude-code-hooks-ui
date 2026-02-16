#!/usr/bin/env bash
set -euo pipefail

# claude-code-hooks installer
# Usage:
#   ./install.sh <target-project-dir> [clone|update|local:/path] [--port <number>]
#
# Examples:
#   ./install.sh /Users/me/my-project
#   ./install.sh /Users/me/my-project local:/Users/me/hooks-source/.claude/hooks
#   ./install.sh . local:$(dirname "$0")
#   ./install.sh /Users/me/my-project local:... --port 4000

HOOKS_REPO="https://github.com/jboothe/claude-code-hooks-ui.git"

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

# ─── Resolve target project ────────────────────────────────────────────────

resolve_target() {
  local target="${1:-}"

  if [ -z "$target" ]; then
    echo ""
    err "Missing required argument: target project directory"
    echo ""
    echo "Usage:"
    echo "  $0 <target-project-dir> [clone|update|local:/path/to/hooks]"
    echo ""
    echo "Examples:"
    echo "  $0 /Users/me/my-project"
    echo "  $0 /Users/me/my-project local:/path/to/hooks-source"
    echo "  $0 .                                              # use current directory"
    echo ""
    exit 1
  fi

  # Resolve to absolute path
  PROJECT_ROOT="$(cd "$target" 2>/dev/null && pwd)" || {
    err "Target directory does not exist: $target"
    exit 1
  }

  # Validate it looks like a project (has .claude/ or at least isn't inside a hooks dir)
  if [[ "$PROJECT_ROOT" == */.claude/hooks* ]] || [[ "$PROJECT_ROOT" == */tts-app* ]]; then
    err "Target looks like a hooks directory, not a project root: $PROJECT_ROOT"
    err "Point this at the project root (the parent of .claude/)."
    exit 1
  fi

  # Set all paths as absolute
  HOOKS_DIR="$PROJECT_ROOT/.claude/hooks"
  SETTINGS_FILE="$PROJECT_ROOT/.claude/settings.local.json"
  TEMPLATE_FILE="$HOOKS_DIR/settings.template.json"

  info "Target project: $PROJECT_ROOT"
  info "Hooks destination: $HOOKS_DIR"
}

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
      # Resolve source to absolute path
      src="$(cd "$src" 2>/dev/null && pwd)" || {
        err "Source directory not found: ${mode#local:}"
        exit 1
      }
      if [ ! -f "$src/package.json" ]; then
        err "Source doesn't look like a hooks directory (no package.json): $src"
        exit 1
      fi
      # Guard against installing into itself
      if [ "$src" = "$HOOKS_DIR" ]; then
        err "Source and destination are the same directory: $src"
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
      mkdir -p "$PROJECT_ROOT/.claude"
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

  mkdir -p "$PROJECT_ROOT/.claude"

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

# ─── Verify installation ────────────────────────────────────────────────────

verify_install() {
  echo ""
  info "Verifying installation..."
  echo ""

  local pass=0
  local fail=0

  check_item() {
    local label="$1"
    local path="$2"
    local type="${3:-file}"  # file or dir

    if [ "$type" = "dir" ]; then
      if [ -d "$path" ]; then
        echo -e "  ${GREEN}✔${NC}  $label"
        ((++pass))
      else
        echo -e "  ${RED}✘${NC}  $label  ${RED}(missing: $path)${NC}"
        ((++fail))
      fi
    else
      if [ -f "$path" ]; then
        echo -e "  ${GREEN}✔${NC}  $label"
        ((++pass))
      else
        echo -e "  ${RED}✘${NC}  $label  ${RED}(missing: $path)${NC}"
        ((++fail))
      fi
    fi
  }

  echo -e "  ${CYAN}── Core files ──${NC}"
  check_item "package.json"            "$HOOKS_DIR/package.json"
  check_item "tsconfig.json"           "$HOOKS_DIR/tsconfig.json"
  check_item "settings.template.json"  "$HOOKS_DIR/settings.template.json"

  echo -e "  ${CYAN}── Hook scripts ──${NC}"
  check_item "stop.ts"                 "$HOOKS_DIR/stop.ts"
  check_item "subagent_stop.ts"        "$HOOKS_DIR/subagent_stop.ts"
  check_item "notification.ts"         "$HOOKS_DIR/notification.ts"
  check_item "session_end.ts"          "$HOOKS_DIR/session_end.ts"
  check_item "session_start.ts"        "$HOOKS_DIR/session_start.ts"
  check_item "pre_tool_use.ts"         "$HOOKS_DIR/pre_tool_use.ts"
  check_item "post_tool_use.ts"        "$HOOKS_DIR/post_tool_use.ts"
  check_item "user_prompt_submit.ts"   "$HOOKS_DIR/user_prompt_submit.ts"
  check_item "pre_compact.ts"          "$HOOKS_DIR/pre_compact.ts"
  check_item "send_event.ts"           "$HOOKS_DIR/send_event.ts"

  echo -e "  ${CYAN}── Libraries ──${NC}"
  check_item "lib/config.ts"           "$HOOKS_DIR/lib/config.ts"
  check_item "lib/tts/"                "$HOOKS_DIR/lib/tts"               "dir"
  check_item "lib/llm/"                "$HOOKS_DIR/lib/llm"               "dir"
  check_item "lib/templates/"          "$HOOKS_DIR/lib/templates"         "dir"

  echo -e "  ${CYAN}── TTS Manager App ──${NC}"
  check_item "tts-app/server.ts"       "$HOOKS_DIR/tts-app/server.ts"
  check_item "tts-app/public/index.html" "$HOOKS_DIR/tts-app/public/index.html"

  echo -e "  ${CYAN}── Dependencies ──${NC}"
  check_item "node_modules/"           "$HOOKS_DIR/node_modules"          "dir"

  echo -e "  ${CYAN}── Settings integration ──${NC}"
  check_item "settings.local.json"     "$SETTINGS_FILE"

  # Check that settings.local.json actually has a "hooks" key
  if [ -f "$SETTINGS_FILE" ]; then
    if command -v jq &>/dev/null; then
      if jq -e '.hooks' "$SETTINGS_FILE" &>/dev/null; then
        echo -e "  ${GREEN}✔${NC}  settings.local.json contains \"hooks\" key"
        ((++pass))
      else
        echo -e "  ${RED}✘${NC}  settings.local.json missing \"hooks\" key"
        ((++fail))
      fi
    else
      if grep -q '"hooks"' "$SETTINGS_FILE" 2>/dev/null; then
        echo -e "  ${GREEN}✔${NC}  settings.local.json contains \"hooks\" key"
        ((++pass))
      else
        echo -e "  ${RED}✘${NC}  settings.local.json missing \"hooks\" key"
        ((++fail))
      fi
    fi
  fi

  echo ""
  if [ "$fail" -eq 0 ]; then
    ok "Verification passed: $pass/$pass checks OK"
  else
    err "Verification: $pass passed, $fail failed"
    warn "Review the failures above and re-run the installer if needed."
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

# ─── Port flag parsing ────────────────────────────────────────────────────────

CONFIGURED_PORT=3455

parse_flags() {
  local new_args=()
  while [ $# -gt 0 ]; do
    case "$1" in
      --port)
        if [ -z "${2:-}" ] || ! [[ "$2" =~ ^[0-9]+$ ]]; then
          err "--port requires a numeric argument"
          exit 1
        fi
        if [ "$2" -lt 1024 ] || [ "$2" -gt 65535 ]; then
          err "Port must be between 1024 and 65535"
          exit 1
        fi
        CONFIGURED_PORT="$2"
        shift 2
        ;;
      *)
        new_args+=("$1")
        shift
        ;;
    esac
  done
  REMAINING_ARGS=("${new_args[@]}")
}

# ─── Configure port ──────────────────────────────────────────────────────────

configure_port() {
  # Only write if a non-default port was explicitly requested
  if [ "$CONFIGURED_PORT" -eq 3455 ]; then
    return
  fi

  local config_file="$HOOKS_DIR/hooks.config.json"
  info "Setting server port to $CONFIGURED_PORT..."

  if command -v jq &>/dev/null; then
    if [ -f "$config_file" ]; then
      local merged
      merged=$(jq --argjson port "$CONFIGURED_PORT" '.server.port = $port' "$config_file")
      echo "$merged" > "$config_file"
    else
      echo "{\"server\":{\"port\":$CONFIGURED_PORT}}" | jq '.' > "$config_file"
    fi
  else
    if [ -f "$config_file" ]; then
      warn "jq not available — cannot merge port into existing config."
      warn "Manually add '\"server\": { \"port\": $CONFIGURED_PORT }' to $config_file"
    else
      echo "{\"server\":{\"port\":$CONFIGURED_PORT}}" > "$config_file"
    fi
  fi

  ok "Server port configured: $CONFIGURED_PORT"
}

# ─── Main ────────────────────────────────────────────────────────────────────

main() {
  # Parse --port flag before processing positional args
  parse_flags "$@"
  set -- "${REMAINING_ARGS[@]}"

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   claude-code-hooks installer v1.1   ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════╝${NC}"
  echo ""

  # First arg is always the target project directory
  resolve_target "${1:-}"

  check_prerequisites

  # Second arg is the install mode (default: clone)
  local mode="${2:-clone}"
  install_hooks "$mode"
  install_deps
  configure_port
  merge_settings
  verify_install
  remind_env

  echo ""
  ok "Installation complete!"
  info "Start a new Claude Code session to activate hooks."
  info "Run 'bun run tts-app' from $HOOKS_DIR to start the Hooks Manager (localhost:$CONFIGURED_PORT)."
  echo ""
}

main "$@"
