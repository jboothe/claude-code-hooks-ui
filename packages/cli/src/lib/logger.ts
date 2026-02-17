/**
 * Colored console output with [hooks] prefix.
 * Zero dependencies — uses ANSI escape codes directly.
 */

const CYAN = '\x1b[0;36m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const RED = '\x1b[0;31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const NC = '\x1b[0m';

export function info(msg: string): void {
  console.log(`${CYAN}[hooks]${NC} ${msg}`);
}

export function ok(msg: string): void {
  console.log(`${GREEN}[hooks]${NC} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${YELLOW}[hooks]${NC} ${msg}`);
}

export function err(msg: string): void {
  console.error(`${RED}[hooks]${NC} ${msg}`);
}

export function dim(msg: string): void {
  console.log(`${DIM}${msg}${NC}`);
}

export function bold(msg: string): void {
  console.log(`${BOLD}${msg}${NC}`);
}

export function banner(): void {
  console.log('');
  console.log(`${CYAN}╔══════════════════════════════════════╗${NC}`);
  console.log(`${CYAN}║   claude-code-hooks-ui CLI v1.0      ║${NC}`);
  console.log(`${CYAN}╚══════════════════════════════════════╝${NC}`);
  console.log('');
}

export function check(label: string, passed: boolean, detail?: string): void {
  if (passed) {
    console.log(`  ${GREEN}✔${NC}  ${label}`);
  } else {
    const extra = detail ? `  ${RED}(${detail})${NC}` : '';
    console.log(`  ${RED}✘${NC}  ${label}${extra}`);
  }
}

export function section(title: string): void {
  console.log(`  ${CYAN}── ${title} ──${NC}`);
}
