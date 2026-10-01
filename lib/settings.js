// Every setting the game can use has a background clip. `setting` goes into the
// text prompt, `shot` into the Veo prompt (scripts/make-clips.mjs), so the
// generated situation and the video always agree on the place.

export const CLIP_SETTINGS = [
  { id: 'lobby', setting: 'the lobby of your apartment building', file: 'Scene.mp4',
    shot: 'The ground-floor entrance lobby of a Hong Kong residential tower, glass doors, mailboxes.' },
  { id: 'school-corridor', setting: 'the corridor of your primary school', shot: 'A bright Hong Kong primary school corridor with classroom doors, notice boards and lockers, open-air windows.' },
  { id: 'classroom', setting: 'your classroom', shot: 'A cheerful Hong Kong primary school classroom with small desks, a whiteboard and children\'s artwork on the walls.' },
  { id: 'playground', setting: 'the housing estate playground', shot: 'A colourful playground in a Hong Kong public housing estate, slides and climbing frames, tall residential blocks behind.' },
  { id: 'library', setting: 'the public library', shot: 'The children\'s section of a Hong Kong public library, low bookshelves, small tables and picture books.' },
  { id: 'cha-chaan-teng', setting: 'a cha chaan teng at lunchtime', shot: 'Inside a busy Hong Kong cha chaan teng diner at lunchtime, booth seats, milk tea on tables, menu boards on the wall.' },
  { id: 'mtr', setting: 'an MTR train carriage', shot: 'Inside a clean Hong Kong MTR train carriage in the middle of the day, metal poles, seats along the sides, a few passengers.' },
  { id: 'supermarket', setting: 'the neighbourhood supermarket', shot: 'An aisle of a small Hong Kong neighbourhood supermarket with shelves of snacks and drinks, a shopping basket on the floor.' },
  { id: 'park', setting: 'the sitting-out area in the park', shot: 'A leafy Hong Kong park sitting-out area with benches, trees and a few elderly people resting.' },
  { id: 'basketball-court', setting: 'the school basketball court during PE', shot: 'An outdoor Hong Kong school basketball court during PE class, painted lines, a ball rack, school buildings around.' },
  { id: 'birthday-party', setting: 'a birthday party at your friend\'s flat', shot: 'A small Hong Kong flat decorated for a child\'s birthday party, balloons, a cake on the table, children\'s party hats.' },
];
