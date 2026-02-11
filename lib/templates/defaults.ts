/**
 * Default TTS message templates.
 * Migrated from hardcoded templates in transcript_parser.py.
 */

import type { AllTemplates } from './types';

export const DEFAULT_TEMPLATES: AllTemplates = {
  stop: {
    withActivities: {
      single: {
        withName: [
          '{{projectName}}: Done, {{userName}}. I {{activity}}.',
          '{{projectName}}: Finished, {{userName}}. Just {{activity}}.',
          '{{projectName}}: {{userName}}, completed. I {{activity}}.',
        ],
        withoutName: [
          '{{projectName}}: Done. I {{activity}}.',
          '{{projectName}}: Finished. Just {{activity}}.',
          '{{projectName}}: Complete. I {{activity}}.',
        ],
      },
      multiple: {
        withName: [
          '{{projectName}}: Done, {{userName}}. Completed {{count}} actions, last one: {{lastActivity}}.',
          '{{projectName}}: {{userName}}, finished with {{count}} steps. Finally {{lastActivity}}.',
          '{{projectName}}: All set, {{userName}}. Did {{count}} things, ending with {{lastActivity}}.',
        ],
        withoutName: [
          '{{projectName}}: Done. Completed {{count}} actions, last: {{lastActivity}}.',
          '{{projectName}}: Finished {{count}} steps. Finally {{lastActivity}}.',
          '{{projectName}}: Complete. Did {{count}} things, ending with {{lastActivity}}.',
        ],
      },
    },
    noActivities: {
      withName: [
        '{{projectName}}: Ready when you are, {{userName}}.',
        '{{projectName}}: All done, {{userName}}.',
        "{{projectName}}: {{userName}}, I'm ready for the next task.",
      ],
      withoutName: [
        '{{projectName}}: Ready for the next task.',
        '{{projectName}}: All done.',
        '{{projectName}}: Task complete.',
      ],
    },
  },
  subagentStop: {
    withDescription: {
      withName: [
        '{{projectName}}: Hey {{userName}}, {{agentName}} finished {{description}}.',
        '{{projectName}}: {{userName}}, {{agentName}} completed {{description}}.',
        '{{projectName}}: Done, {{userName}}. {{agentName}} finished {{description}}.',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} finished {{description}}.',
        '{{projectName}}: {{agentName}} completed {{description}}.',
        '{{projectName}}: Done. {{agentName}} finished {{description}}.',
        '{{projectName}}: {{agentName}} done with {{description}}.',
      ],
    },
    noDescription: {
      withName: [
        '{{projectName}}: Hey {{userName}}, {{agentName}} is done.',
        '{{projectName}}: {{userName}}, {{agentName}} finished.',
        '{{projectName}}: Done, {{userName}}. {{agentName}} completed its task.',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} is done.',
        '{{projectName}}: {{agentName}} finished.',
        '{{projectName}}: {{agentName}} completed its task.',
      ],
    },
  },
  notification: {
    withName: '{{projectName}}: {{userName}}, your agent needs your input',
    withoutName: '{{projectName}}: Your agent needs your input',
  },
  sessionEnd: {
    clear: '{{projectName}}: Session cleared',
    logout: '{{projectName}}: Logging out',
    prompt_input_exit: '{{projectName}}: Session ended',
    other: '{{projectName}}: Session ended',
  },
};

export const PROFESSIONAL_TEMPLATES: AllTemplates = {
  stop: {
    withActivities: {
      single: {
        withName: [
          '{{projectName}}: Task completed successfully, {{userName}}. I {{activity}}.',
          '{{projectName}}: Operation concluded, {{userName}}. I have {{activity}}.',
          '{{projectName}}: {{userName}}, the requested changes have been applied. I {{activity}}.',
        ],
        withoutName: [
          '{{projectName}}: Task completed successfully. I {{activity}}.',
          '{{projectName}}: Operation concluded. The requested changes have been applied. I {{activity}}.',
          '{{projectName}}: Work has been completed. I {{activity}}.',
        ],
      },
      multiple: {
        withName: [
          '{{projectName}}: All {{count}} operations completed successfully, {{userName}}. Final action: {{lastActivity}}.',
          '{{projectName}}: {{userName}}, {{count}} tasks have been executed. Concluding with {{lastActivity}}.',
          '{{projectName}}: Work complete, {{userName}}. {{count}} steps performed, ending with {{lastActivity}}.',
        ],
        withoutName: [
          '{{projectName}}: All {{count}} operations completed successfully. Final action: {{lastActivity}}.',
          '{{projectName}}: {{count}} tasks have been executed. Concluding with {{lastActivity}}.',
          '{{projectName}}: Work complete. {{count}} steps performed, ending with {{lastActivity}}.',
        ],
      },
    },
    noActivities: {
      withName: [
        '{{projectName}}: Standing by for further instructions, {{userName}}.',
        '{{projectName}}: {{userName}}, all tasks have been addressed.',
        '{{projectName}}: Ready to proceed, {{userName}}.',
      ],
      withoutName: [
        '{{projectName}}: Standing by for further instructions.',
        '{{projectName}}: All tasks have been addressed.',
        '{{projectName}}: Ready to proceed with the next request.',
      ],
    },
  },
  subagentStop: {
    withDescription: {
      withName: [
        '{{projectName}}: {{userName}}, {{agentName}} has completed {{description}}.',
        '{{projectName}}: {{agentName}} has concluded {{description}}, {{userName}}.',
        '{{projectName}}: {{userName}}, the {{agentName}} operation for {{description}} is complete.',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} has completed {{description}}.',
        '{{projectName}}: {{agentName}} has concluded {{description}}.',
        '{{projectName}}: The {{agentName}} operation for {{description}} is complete.',
        '{{projectName}}: {{agentName}} has finished processing {{description}}.',
      ],
    },
    noDescription: {
      withName: [
        '{{projectName}}: {{userName}}, {{agentName}} has completed its assignment.',
        '{{projectName}}: {{agentName}} has concluded its task, {{userName}}.',
        '{{projectName}}: {{userName}}, the {{agentName}} operation is complete.',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} has completed its assignment.',
        '{{projectName}}: {{agentName}} has concluded its task.',
        '{{projectName}}: The {{agentName}} operation is complete.',
      ],
    },
  },
  notification: {
    withName: '{{projectName}}: {{userName}}, your attention is required',
    withoutName: '{{projectName}}: Your attention is required',
  },
  sessionEnd: {
    clear: '{{projectName}}: Session has been cleared',
    logout: '{{projectName}}: Logging out of session',
    prompt_input_exit: '{{projectName}}: Session has concluded',
    other: '{{projectName}}: Session has concluded',
  },
};

export const CONCISE_TEMPLATES: AllTemplates = {
  stop: {
    withActivities: {
      single: {
        withName: [
          '{{projectName}}: Done, {{userName}}. {{activity}}.',
          '{{projectName}}: {{userName}}, done. {{activity}}.',
          '{{projectName}}: Wrapped up. {{activity}}, {{userName}}.',
        ],
        withoutName: [
          '{{projectName}}: Done. {{activity}}.',
          '{{projectName}}: Wrapped up. {{activity}}.',
          '{{projectName}}: Complete. {{activity}}.',
        ],
      },
      multiple: {
        withName: [
          '{{projectName}}: {{userName}}, {{count}} steps done. Last: {{lastActivity}}.',
          '{{projectName}}: Done, {{userName}}. {{count}} actions. Final: {{lastActivity}}.',
          '{{projectName}}: {{count}} done, {{userName}}. Ended with {{lastActivity}}.',
        ],
        withoutName: [
          '{{projectName}}: {{count}} steps done. Last: {{lastActivity}}.',
          '{{projectName}}: Done. {{count}} actions. Final: {{lastActivity}}.',
          '{{projectName}}: {{count}} done. Ended with {{lastActivity}}.',
        ],
      },
    },
    noActivities: {
      withName: [
        '{{projectName}}: Ready, {{userName}}.',
        '{{projectName}}: All set, {{userName}}.',
        '{{projectName}}: Done, {{userName}}.',
      ],
      withoutName: [
        '{{projectName}}: Ready.',
        '{{projectName}}: All set.',
        '{{projectName}}: Done.',
      ],
    },
  },
  subagentStop: {
    withDescription: {
      withName: [
        '{{projectName}}: {{userName}}, {{agentName}} done. {{description}}.',
        '{{projectName}}: {{agentName}} finished {{description}}, {{userName}}.',
        '{{projectName}}: {{userName}}, {{agentName}} wrapped up {{description}}.',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} done. {{description}}.',
        '{{projectName}}: {{agentName}} finished {{description}}.',
        '{{projectName}}: {{agentName}} wrapped up {{description}}.',
        '{{projectName}}: {{agentName}} complete. {{description}}.',
      ],
    },
    noDescription: {
      withName: [
        '{{projectName}}: {{userName}}, {{agentName}} done.',
        '{{projectName}}: {{agentName}} finished, {{userName}}.',
        '{{projectName}}: {{userName}}, {{agentName}} wrapped up.',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} done.',
        '{{projectName}}: {{agentName}} finished.',
        '{{projectName}}: {{agentName}} wrapped up.',
      ],
    },
  },
  notification: {
    withName: '{{projectName}}: {{userName}}, input needed',
    withoutName: '{{projectName}}: Input needed',
  },
  sessionEnd: {
    clear: '{{projectName}}: Cleared',
    logout: '{{projectName}}: Logged out',
    prompt_input_exit: '{{projectName}}: Ended',
    other: '{{projectName}}: Ended',
  },
};

export const PLAYFUL_TEMPLATES: AllTemplates = {
  stop: {
    withActivities: {
      single: {
        withName: [
          '{{projectName}}: Nailed it, {{userName}}! I {{activity}}.',
          '{{projectName}}: Boom, all set, {{userName}}! Just {{activity}}.',
          '{{projectName}}: High five, {{userName}}! I {{activity}}.',
        ],
        withoutName: [
          '{{projectName}}: Nailed it! I {{activity}}.',
          '{{projectName}}: Boom, done! Just {{activity}}.',
          '{{projectName}}: Crushed it! I {{activity}}.',
        ],
      },
      multiple: {
        withName: [
          '{{projectName}}: {{userName}}, I was on fire! Knocked out {{count}} things, finishing with {{lastActivity}}.',
          '{{projectName}}: Boom, {{userName}}! {{count}} tasks down, last one was {{lastActivity}}.',
          '{{projectName}}: {{userName}}, {{count}} things smashed! Ended with {{lastActivity}}.',
        ],
        withoutName: [
          '{{projectName}}: On fire! Knocked out {{count}} things, finishing with {{lastActivity}}.',
          '{{projectName}}: Boom! {{count}} tasks down, last one was {{lastActivity}}.',
          '{{projectName}}: {{count}} things smashed! Ended with {{lastActivity}}.',
        ],
      },
    },
    noActivities: {
      withName: [
        '{{projectName}}: What is next, {{userName}}? I am ready to roll!',
        '{{projectName}}: {{userName}}, bring it on! Ready for more.',
        '{{projectName}}: All done, {{userName}}! Hit me with the next one.',
      ],
      withoutName: [
        '{{projectName}}: Ready to roll! What is next?',
        '{{projectName}}: Bring it on! Ready for more.',
        '{{projectName}}: All done! Hit me with the next one.',
      ],
    },
  },
  subagentStop: {
    withDescription: {
      withName: [
        '{{projectName}}: Hey {{userName}}, {{agentName}} just crushed {{description}}!',
        '{{projectName}}: {{userName}}, {{agentName}} is done with {{description}}. Nice!',
        '{{projectName}}: Woot! {{agentName}} wrapped up {{description}}, {{userName}}!',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} just crushed {{description}}!',
        '{{projectName}}: {{agentName}} is done with {{description}}. Nice!',
        '{{projectName}}: Woot! {{agentName}} wrapped up {{description}}!',
        '{{projectName}}: {{agentName}} knocked out {{description}}!',
      ],
    },
    noDescription: {
      withName: [
        '{{projectName}}: {{userName}}, {{agentName}} is done and dusted!',
        '{{projectName}}: {{agentName}} just dropped the mic, {{userName}}!',
        '{{projectName}}: {{userName}}, {{agentName}} nailed it!',
      ],
      withoutName: [
        '{{projectName}}: {{agentName}} is done and dusted!',
        '{{projectName}}: {{agentName}} just dropped the mic!',
        '{{projectName}}: {{agentName}} nailed it!',
      ],
    },
  },
  notification: {
    withName: '{{projectName}}: Yo {{userName}}, your agent needs a hand over here!',
    withoutName: '{{projectName}}: Hey, your agent needs a hand over here!',
  },
  sessionEnd: {
    clear: '{{projectName}}: Session wiped clean! Fresh start awaits.',
    logout: '{{projectName}}: Peace out! Logging off.',
    prompt_input_exit: '{{projectName}}: That is a wrap! See you next time.',
    other: '{{projectName}}: That is a wrap! See you next time.',
  },
};

/** Map of tone names to their template sets */
export const TONE_TEMPLATES: Record<string, AllTemplates> = {
  default: DEFAULT_TEMPLATES,
  professional: PROFESSIONAL_TEMPLATES,
  concise: CONCISE_TEMPLATES,
  playful: PLAYFUL_TEMPLATES,
};
