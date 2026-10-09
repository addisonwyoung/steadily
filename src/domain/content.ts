import type { HabitInput, Reason } from './schema';

export const presets: Record<string, HabitInput> = {
  'Move more': {
    title: 'Take a walk',
    normal: 'Walk for 15 minutes',
    minimum: 'Step outside for 2 minutes',
    time: 'Morning',
    icon: '↗',
  },
  'Read & learn': {
    title: 'Read a few pages',
    normal: 'Read for 10 minutes',
    minimum: 'Read one page',
    time: 'Morning',
    icon: '▤',
  },
  'Better sleep': {
    title: 'Wind down',
    normal: 'Put my phone away 30 minutes before bed',
    minimum: 'Put my phone away for 5 minutes',
    time: 'Evening',
    icon: '☾',
  },
  'Less scrolling': {
    title: 'A screen-free morning',
    normal: 'Wait 20 minutes before social media',
    minimum: 'Wait 2 minutes before social media',
    time: 'Morning',
    icon: '◷',
  },
  'Study & focus': {
    title: 'Make room to focus',
    normal: 'Study for 25 minutes',
    minimum: 'Open my notes for 2 minutes',
    time: 'Morning',
    icon: '◎',
  },
  'Something else': {
    title: 'My small habit',
    normal: 'Spend 10 minutes on my goal',
    minimum: 'Spend 1 minute on my goal',
    time: 'Anytime',
    icon: '✧',
  },
};
export const challenges = [
  {
    title: 'A slower start',
    description: 'Wait 10 minutes after waking before opening social media.',
  },
  {
    title: 'One mindful meal',
    description: 'Enjoy one meal without a screen. Notice the food and your surroundings.',
  },
  { title: 'Take the scenic route', description: 'Take a 5-minute walk with your phone put away.' },
  { title: 'Turn a few pages', description: 'Read a book or magazine for 10 minutes.' },
  { title: 'Make something just because', description: 'Spend 10 minutes on an offline hobby.' },
  {
    title: 'A little room for quiet',
    description: 'Sit outside or by a window for 5 minutes without entertainment.',
  },
  {
    title: 'Keep what felt good',
    description: 'Repeat your favorite offline activity from this week.',
  },
];
export const suggestions: Record<Reason, string> = {
  Tiredness:
    'Let the minimum version be enough. Try it at the time of day you usually have more energy.',
  'Insufficient time':
    'Reserve two minutes after something you already do, such as breakfast. Start with the minimum version.',
  Distraction:
    'Put your phone out of reach before you begin. Make the first two minutes screen-free.',
  Forgetting: 'Attach this habit to a familiar routine and choose a time you can remember.',
  'Excessive difficulty':
    'Make the normal version smaller. Keep a minimum version that feels possible on a hard day.',
};
