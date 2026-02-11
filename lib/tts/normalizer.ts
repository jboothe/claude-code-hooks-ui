/**
 * TTS text normalizer — cleans URLs, file paths, hex hashes, and other
 * machine-readable strings so they sound natural when spoken aloud.
 *
 * Runs as a pre-processing step before text is sent to any TTS provider.
 */

/**
 * Simplify a URL to its domain (and optionally one meaningful path segment).
 * "https://api.example.com/v2/users/123?q=foo" → "example dot com"
 */
function simplifyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Strip "www." prefix
    let host = parsed.hostname.replace(/^www\./, '');
    // Speak dots as "dot" for clarity
    host = host.replace(/\./g, ' dot ');
    return host;
  } catch {
    // Malformed URL — just return a trimmed version
    return url.replace(/https?:\/\//, '').split('/')[0];
  }
}

/**
 * Simplify a file path to the last 1–2 meaningful segments.
 * "/Users/jeff/dev/hooks/lib/config.ts" → "config.ts"
 * "src/components/Button.tsx" → "Button.tsx"
 */
function simplifyPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  if (segments.length <= 2) return segments.join('/');
  // Return last segment (filename), or parent/filename for context
  const file = segments[segments.length - 1];
  const parent = segments[segments.length - 2];
  // If the filename alone is descriptive enough, just use it
  if (file.includes('.')) return file;
  return `${parent}/${file}`;
}

/**
 * Truncate long hex strings (git SHAs, hashes) to a short prefix.
 * "a1b2c3d4e5f67890abcdef1234567890" → "hash a1b2c3"
 */
function simplifyHex(hex: string): string {
  return `hash ${hex.slice(0, 6)}`;
}

/**
 * Simplify dotted package/class paths.
 * "com.example.foo.BarService" → "BarService"
 */
function simplifyDottedPath(dottedPath: string): string {
  const parts = dottedPath.split('.');
  return parts[parts.length - 1];
}

/**
 * Normalize text for natural TTS pronunciation.
 * Applies a series of regex-based transformations to clean up
 * URLs, file paths, hex strings, and other machine-readable tokens.
 */
export function normalizeTTSText(text: string): string {
  let result = text;

  // 1. URLs — replace full URLs with simplified domain
  result = result.replace(/https?:\/\/[^\s,)}\]]+/g, (match) => simplifyUrl(match));

  // 2. Absolute file paths (3+ segments starting with /)
  result = result.replace(/\/(?:[^\s/]+\/){2,}[^\s/]+/g, (match) => simplifyPath(match));

  // 3. Relative file paths with 3+ segments (e.g. src/lib/foo/bar.ts)
  result = result.replace(/(?<![:\w])(?:[a-zA-Z0-9_.-]+\/){2,}[a-zA-Z0-9_.-]+/g, (match) => {
    // Skip things that look like they were already simplified or are short
    if (match.split('/').filter(Boolean).length < 3) return match;
    return simplifyPath(match);
  });

  // 4. Long hex strings (8+ consecutive hex chars, likely hashes/SHAs)
  result = result.replace(/\b[0-9a-f]{8,}\b/gi, (match) => {
    // Only treat as hex if it's not a normal word (has digits mixed in)
    if (/\d/.test(match) && /[a-f]/i.test(match)) return simplifyHex(match);
    return match;
  });

  // 5. Dotted package paths (3+ dot-separated segments, e.g. com.foo.bar.Baz)
  result = result.replace(/\b[a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*){3,}\b/g, (match) => {
    // Don't touch things that look like domains (already handled) or file extensions
    if (/\.(com|org|net|io|dev|js|ts|py|go|rs|java|css|html)$/i.test(match)) return match;
    return simplifyDottedPath(match);
  });

  // 6. Clean up any resulting double-spaces
  result = result.replace(/  +/g, ' ').trim();

  return result;
}
