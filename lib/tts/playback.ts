/**
 * Cross-platform audio playback and native TTS helpers.
 *
 * - macOS:   afplay (MP3) / say (native TTS)
 * - Windows: PowerShell + WPF MediaPlayer (MP3) / System.Speech (native TTS)
 * - Linux:   mpg123 | ffplay | paplay (MP3) / espeak (native TTS)
 */

/**
 * Play an MP3 (or WAV) audio file using the platform-appropriate player.
 * Resolves when playback is complete.
 */
export async function playAudioFile(filePath: string): Promise<void> {
  switch (process.platform) {
    case 'darwin': {
      const proc = Bun.spawn(['afplay', filePath], {
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await proc.exited;
      if (code !== 0) throw new Error(`afplay exited with code ${code}`);
      break;
    }

    case 'win32': {
      // Build a file:// URI that PowerShell's [uri] understands
      const fileUri = 'file:///' + filePath.replace(/\\/g, '/');
      const safeUri = fileUri.replace(/'/g, "''");

      const script = [
        'Add-Type -AssemblyName PresentationCore',
        '$p = New-Object System.Windows.Media.MediaPlayer',
        `$p.Open([uri]'${safeUri}')`,
        // Give WPF time to open & buffer the media
        'Start-Sleep -Milliseconds 600',
        '$p.Play()',
        // Wait until duration is known, then sleep for that long
        '$t = 0',
        'while (-not $p.NaturalDuration.HasTimeSpan -and $t -lt 50) { Start-Sleep -Milliseconds 100; $t++ }',
        'if ($p.NaturalDuration.HasTimeSpan) {',
        '  Start-Sleep -Milliseconds ([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds + 250)',
        '} else {',
        '  Start-Sleep -Seconds 10',
        '}',
        '$p.Close()',
      ].join('\n');

      const proc = Bun.spawn(['powershell', '-NoProfile', '-Command', script], {
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await proc.exited;
      if (code !== 0) throw new Error(`PowerShell audio playback exited with code ${code}`);
      break;
    }

    default: {
      // Linux — try common CLI players in order of preference
      const players: string[][] = [
        ['mpg123', filePath],
        ['ffplay', '-nodisp', '-autoexit', filePath],
        ['paplay', filePath],
      ];

      for (const [cmd, ...args] of players) {
        try {
          const proc = Bun.spawn([cmd, ...args], {
            stdout: 'inherit',
            stderr: 'inherit',
          });
          if ((await proc.exited) === 0) return;
        } catch {
          continue;
        }
      }
      throw new Error('No audio player found. Install mpg123, ffplay, or paplay.');
    }
  }
}

/**
 * Speak text using the platform's built-in TTS engine (no API key required).
 * Resolves when speech is complete.
 */
export async function speakNative(
  text: string,
  voice?: string,
  rate?: number,
): Promise<void> {
  switch (process.platform) {
    case 'darwin': {
      const args = ['say'];
      if (voice) args.push('-v', voice);
      if (rate) args.push('-r', String(rate));
      args.push(text);

      const proc = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' });
      const code = await proc.exited;
      if (code !== 0) throw new Error(`say exited with code ${code}`);
      break;
    }

    case 'win32': {
      // Map macOS wpm rate (default ~175) to Windows -10..10 scale (default 0)
      let winRate = 0;
      if (rate) {
        winRate = Math.max(-10, Math.min(10, Math.round((rate - 175) / 25)));
      }

      const escaped = text.replace(/'/g, "''");
      const script = [
        'Add-Type -AssemblyName System.Speech',
        '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer',
        `$s.Rate = ${winRate}`,
        `$s.Speak('${escaped}')`,
        '$s.Dispose()',
      ].join('\n');

      const proc = Bun.spawn(['powershell', '-NoProfile', '-Command', script], {
        stdout: 'inherit',
        stderr: 'inherit',
      });
      const code = await proc.exited;
      if (code !== 0) throw new Error(`PowerShell native TTS exited with code ${code}`);
      break;
    }

    default: {
      // Linux — espeak
      const args = ['espeak'];
      if (rate) args.push('-s', String(rate));
      args.push(text);

      const proc = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' });
      const code = await proc.exited;
      if (code !== 0) throw new Error(`espeak exited with code ${code}`);
    }
  }
}
