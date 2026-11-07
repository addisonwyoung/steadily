import type { HabitInput, Reason } from './schema';

export const presets: Record<string, HabitInput> = {
  'Move more': {
    title: 'Take a walk',
    normal: 'Walk for 15 minutes',
    time: 'Morning',
    icon: '↗',
  },
  'Read & learn': {
    title: 'Read a few pages',
    normal: 'Read for 10 minutes',
    time: 'Morning',
    icon: '▤',
  },
  'Better sleep': {
    title: 'Wind down',
    normal: 'Put my phone away 30 minutes before bed',
    time: 'Evening',
    icon: '☾',
  },
  'Less scrolling': {
    title: 'A screen-free morning',
    normal: 'Wait 20 minutes before social media',
    time: 'Morning',
    icon: '◷',
  },
  'Study & focus': {
    title: 'Make room to focus',
    normal: 'Study for 25 minutes',
    time: 'Morning',
    icon: '◎',
  },
  'Stretch break': {
    title: 'Stretch break',
    normal: 'Stretch for 5 minutes',
    time: 'Anytime',
    icon: '↗',
  },
  'Drink water': {
    title: 'Drink water',
    normal: 'Have a glass of water with breakfast',
    time: 'Morning',
    icon: '◌',
  },
  'Eat some fruit': {
    title: 'Eat some fruit',
    normal: 'Add a piece of fruit to a meal',
    time: 'Anytime',
    icon: '✿',
  },
  'Add vegetables': {
    title: 'Add vegetables',
    normal: 'Include vegetables with a meal',
    time: 'Evening',
    icon: '✿',
  },
  'Screen-free meal': {
    title: 'Screen-free meal',
    normal: 'Eat one meal without my phone',
    time: 'Anytime',
    icon: '◷',
  },
  'Consistent bedtime': {
    title: 'Consistent bedtime',
    normal: 'Start my bedtime routine at my chosen time',
    time: 'Evening',
    icon: '☾',
  },
  'Get outside': {
    title: 'Get outside',
    normal: 'Spend 10 minutes outdoors',
    time: 'Afternoon',
    icon: '☀',
  },
  'Pause and breathe': {
    title: 'Pause and breathe',
    normal: 'Spend 2 minutes breathing comfortably',
    time: 'Anytime',
    icon: '◌',
  },
  'Write a reflection': {
    title: 'Write a reflection',
    normal: 'Write a few sentences about my day',
    time: 'Evening',
    icon: '▤',
  },
  'Notice something good': {
    title: 'Notice something good',
    normal: 'Write down one thing I appreciated today',
    time: 'Evening',
    icon: '✧',
  },
  'Connect with someone': {
    title: 'Connect with someone',
    normal: 'Call or message someone I care about',
    time: 'Anytime',
    icon: '♡',
  },
  'Make room to create': {
    title: 'Make room to create',
    normal: 'Spend 10 minutes on a creative hobby',
    time: 'Anytime',
    icon: '✎',
  },
  'Clear my space': {
    title: 'Clear my space',
    normal: 'Tidy one surface for 5 minutes',
    time: 'Evening',
    icon: '◇',
  },
  'Plan tomorrow': {
    title: 'Plan tomorrow',
    normal: 'Write down my main task for tomorrow',
    time: 'Evening',
    icon: '◎',
  },
  'Take a movement break': {
    title: 'Take a movement break',
    normal: 'Step away from my desk and move around',
    time: 'Afternoon',
    icon: '↗',
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
  Tiredness: 'Try your habit at the time of day you usually have more energy.',
  'Insufficient time':
    'Reserve two minutes after something you already do, such as breakfast. Choose a task that fits that time.',
  Distraction:
    'Put your phone out of reach before you begin. Make the first two minutes screen-free.',
  Forgetting: 'Attach this habit to a familiar routine and choose a time you can remember.',
  'Excessive difficulty': 'Adjust your task so it feels achievable.',
};
