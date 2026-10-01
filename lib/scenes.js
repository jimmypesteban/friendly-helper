// What is actually on screen in each clip's frozen frame (clips/frames/<id>.jpg),
// written by looking at the frames. The text model never sees the video, so
// without this it invented people and props that weren't there ("Grandma Wong
// drops her crayons" over a frame of commuters on their phones).
//
// Each moment is a person who is visible in the frame, given a relationship to
// the player (so they're never a stranger), and a need built from visible props.

export const SCENES = {
  lobby: {
    onScreen: 'An apartment building lobby with glass doors in the middle. On the left a young man in a white shirt stands looking at his phone next to a yellow wet-floor sign. On the right, someone in a white T-shirt carries a huge cardboard box toward the glass doors.',
    moments: [
      { who: 'your neighbor Mr. Chen, carrying the huge cardboard box on the right', need: 'his arms are full of the big box and he cannot open the glass doors' },
      { who: 'your neighbor Mr. Chen, carrying the huge cardboard box on the right', need: 'the box blocks his view and he cannot see the yellow wet-floor sign in his way' },
      { who: 'your uncle Ken, the man in the white shirt looking at his phone', need: 'he is busy on his phone and has not noticed his keys fell on the floor by the wet-floor sign' },
    ],
  },
  'school-corridor': {
    onScreen: 'A sunny primary school corridor with red lockers on the left, one locker door wide open with books on its shelves. Two girls in light-blue school uniforms with dark backpacks are walking past on the right.',
    moments: [
      { who: 'your classmate Tsz Yan, the girl with the ponytail and backpack walking in front', need: 'she left her locker door open and her books are about to slide off the shelf' },
      { who: 'your classmate Mia, the second girl walking behind', need: 'she is new and does not know which classroom to go to' },
    ],
  },
  classroom: {
    onScreen: 'A primary school classroom seen from the back row: children in white uniforms at desks with orange and blue chairs, pink and green backpacks on the floor, a big screen and children\'s drawings at the front. A teacher talks with two grown-ups by the door, and a stack of storybooks sits on a blue box.',
    moments: [
      { who: 'your classmate Priya, the girl with the ponytail at the desk on the right', need: 'her pink pencil case is open and she has no pencil left to write with' },
      { who: 'your teacher Ms. Rivera, standing by the door', need: 'she needs the stack of storybooks from the blue box but is busy talking with the grown-ups' },
      { who: 'your classmate Ka Ho, the boy in the front row', need: 'a pink backpack has fallen over in the aisle next to his chair where people walk' },
    ],
  },
  playground: {
    onScreen: 'A housing estate playground with yellow slides and a blue climbing frame with a rope net, tall apartment towers behind. An older lady in an apron bends down to sweep under the climbing frame. A broom and blue dustpan lean against the frame, and a green bench is on the right.',
    moments: [
      { who: 'Grandma Wong, the older lady in the apron sweeping under the climbing frame', need: 'she is bending low to sweep up leaves and her dustpan is out of reach by the slide' },
      { who: 'Grandma Wong, the older lady in the apron sweeping under the climbing frame', need: 'she is tired from sweeping and wants to rest on the green bench, but it is covered in leaves' },
    ],
  },
  library: {
    onScreen: 'The children\'s corner of a public library: a low box of picture books in front, colourful floor mats, a woman reading with a small boy at a blue table with orange and green chairs, children reading by the big windows, and a man in a white shirt walking between tall bookshelves.',
    moments: [
      { who: 'your little cousin Lucas, the small boy at the blue table', need: 'he wants more picture books from the box but cannot carry them to the table by himself' },
      { who: 'Grandpa Lee, the man in the white shirt walking by the shelves', need: 'he is looking for the picture books to read with you and cannot find the children\'s box' },
    ],
  },
  'cha-chaan-teng': {
    onScreen: 'A busy cha chaan teng with red booth seats and colourful menu boards on the wall. In front: a plate of noodles with roast pork, chopsticks, bamboo steamer baskets and an iced milk tea. A waiter in a white shirt and tie walks past with a full tray, and groups of women chat and laugh in the booths.',
    moments: [
      { who: 'Auntie May, the lady laughing in the booth on the right', need: 'her chopsticks fell off the table and she cannot reach them from the booth' },
      { who: 'Uncle Ming, the waiter who knows your family, walking past with a full tray', need: 'his hands are full and a chair is sticking out into his path' },
    ],
  },
  mtr: {
    onScreen: 'Inside an MTR train carriage with green seats along both sides and metal poles. On the left a girl in a white school blouse sits looking at her phone with a big black handbag on her lap. In the middle a man in a blue shirt with a backpack stands looking at his phone. On the right a pile of bags sits on the seats.',
    moments: [
      { who: 'your cousin Chloe, the older girl in the white school blouse on the left', need: 'her big black handbag is slipping off her lap while she looks at her phone' },
      { who: 'your uncle Ken, the man with glasses standing in the middle', need: 'your family\'s bags are piled on the seats on the right and he has nowhere to sit' },
    ],
  },
  supermarket: {
    onScreen: 'A supermarket aisle with shelves of colourful snack bags on the left and bottled drinks on the right. An older man in a white vest pushes a shopping trolley piled high with snacks. Two women shop near the doors at the back.',
    moments: [
      { who: 'Grandpa Lee, the older man in the white vest pushing the full trolley', need: 'the trolley is so full that snack bags keep falling off the top' },
      { who: 'Grandpa Lee, the older man in the white vest pushing the full trolley', need: 'he wants a bottle of soy sauce from the low shelf, but both hands are on the heavy trolley' },
    ],
  },
  park: {
    onScreen: 'A leafy park sitting-out area under big banyan trees. An older man in a white vest sits on a green bench with a newspaper on his lap, a metal flask and another newspaper beside him. An older lady in a pink jacket does tai chi on the path, and people stroll in the background.',
    moments: [
      { who: 'Grandpa Lee, the older man on the green bench', need: 'the wind is blowing the pages of the newspaper beside him off the bench' },
      { who: 'Grandma Wong, the lady in the pink jacket doing tai chi', need: 'she is thirsty after tai chi but her water flask is on the bench far away' },
    ],
  },
  'basketball-court': {
    onScreen: 'An outdoor school basketball court during PE: a rack of basketballs on wheels on the left, a yellow cone and a child dribbling in front, children in blue PE kits holding balls at the back, and a teacher with a clipboard on the right.',
    moments: [
      { who: 'your teammate Omar, a boy in a blue PE kit at the back', need: 'his ball rolled away under the ball rack and he looks embarrassed' },
      { who: 'your PE teacher Ms. Rivera, holding the clipboard on the right', need: 'she needs the ball rack moved back to the wall before the game starts' },
      { who: 'your little brother Kai, the smallest child at the back', need: 'the big basketball is too heavy for him to bounce and he looks sad' },
    ],
  },
};
