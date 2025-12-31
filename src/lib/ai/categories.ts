/**
 * LEGO Category Detection and Guidelines
 *
 * Auto-detects build category from user prompts and provides
 * category-specific building guidelines to improve generation quality.
 */

/**
 * Supported LEGO build categories.
 * 'general' is the fallback when no category is detected.
 */
export type LegoCategory =
  | 'vehicles'
  | 'buildings'
  | 'animals'
  | 'characters'
  | 'furniture'
  | 'nature'
  | 'food'
  | 'abstract'
  | 'general';

/**
 * Brick count ranges per category.
 * Ensures models have enough bricks for proper shape definition.
 */
export const CATEGORY_BRICK_COUNTS: Record<LegoCategory, { min: number; max: number }> = {
  // Complex models need more bricks
  vehicles: { min: 50, max: 80 },
  buildings: { min: 50, max: 80 },
  animals: { min: 50, max: 80 },
  characters: { min: 50, max: 80 },
  // Medium complexity
  furniture: { min: 30, max: 50 },
  nature: { min: 30, max: 50 },
  // Simple models
  food: { min: 20, max: 30 },
  abstract: { min: 20, max: 30 },
  // General fallback
  general: { min: 40, max: 60 },
};

/**
 * Keywords for auto-detection, organized by category.
 * More specific terms should come first for better matching.
 */
export const CATEGORY_KEYWORDS: Record<Exclude<LegoCategory, 'general'>, string[]> = {
  vehicles: [
    // Wheeled vehicles
    'car', 'truck', 'bus', 'van', 'motorcycle', 'bike', 'bicycle', 'scooter',
    'race car', 'sports car', 'suv', 'jeep', 'pickup', 'ambulance', 'fire truck',
    'police car', 'taxi', 'limousine',
    // Aircraft
    'plane', 'airplane', 'helicopter', 'jet', 'aircraft', 'rocket', 'spaceship',
    'spacecraft', 'ufo', 'drone',
    // Water vehicles
    'boat', 'ship', 'submarine', 'yacht', 'sailboat', 'canoe', 'kayak', 'ferry',
    // Rail
    'train', 'locomotive', 'tram', 'trolley',
    // Heavy machinery
    'tractor', 'bulldozer', 'crane', 'excavator', 'forklift',
    // Generic
    'vehicle', 'wheels', 'engine',
  ],

  buildings: [
    // Residential
    'house', 'home', 'cottage', 'cabin', 'mansion', 'apartment', 'condo',
    'skyscraper', 'villa',
    // Commercial
    'store', 'shop', 'mall', 'office', 'bank', 'hotel', 'restaurant', 'cafe',
    'hospital', 'school', 'library', 'museum',
    // Other structures
    'castle', 'palace', 'temple', 'church', 'cathedral', 'mosque', 'pyramid',
    'lighthouse', 'windmill', 'barn', 'factory', 'warehouse', 'garage',
    'bridge', 'stadium', 'arena',
    // Generic
    'building', 'structure', 'architecture', 'room', 'floor',
  ],

  animals: [
    // Mammals
    'dog', 'cat', 'horse', 'cow', 'pig', 'sheep', 'goat', 'rabbit', 'bunny',
    'elephant', 'lion', 'tiger', 'bear', 'wolf', 'fox', 'deer', 'giraffe',
    'monkey', 'gorilla', 'panda', 'koala', 'kangaroo', 'mouse', 'rat',
    // Birds
    'bird', 'eagle', 'owl', 'penguin', 'parrot', 'chicken', 'duck', 'swan',
    'flamingo', 'peacock', 'crow', 'sparrow',
    // Sea creatures
    'fish', 'shark', 'whale', 'dolphin', 'octopus', 'crab', 'lobster',
    'jellyfish', 'turtle', 'seal',
    // Reptiles & amphibians
    'snake', 'lizard', 'crocodile', 'alligator', 'frog', 'toad', 'dinosaur',
    't-rex', 'triceratops', 'raptor', 'dragon',
    // Insects
    'butterfly', 'bee', 'spider', 'ant', 'ladybug', 'dragonfly',
    // Generic
    'animal', 'creature', 'pet', 'wildlife',
  ],

  characters: [
    // Human types
    'person', 'man', 'woman', 'boy', 'girl', 'child', 'baby', 'family',
    'soldier', 'knight', 'warrior', 'ninja', 'pirate', 'cowboy', 'astronaut',
    'firefighter', 'police officer', 'doctor', 'nurse', 'chef', 'farmer',
    // Fantasy characters
    'wizard', 'witch', 'fairy', 'elf', 'dwarf', 'giant', 'troll', 'ogre',
    'vampire', 'zombie', 'ghost', 'skeleton', 'mummy', 'werewolf',
    'superhero', 'villain',
    // Fictional
    'robot', 'android', 'alien', 'monster', 'minifigure', 'action figure',
    // Generic
    'character', 'figure', 'statue', 'bust', 'portrait',
  ],

  furniture: [
    // Seating
    'chair', 'sofa', 'couch', 'bench', 'stool', 'armchair', 'recliner', 'throne',
    // Tables
    'table', 'desk', 'coffee table', 'dining table', 'nightstand',
    // Storage
    'cabinet', 'shelf', 'bookshelf', 'dresser', 'wardrobe', 'closet', 'drawer',
    'chest',
    // Beds
    'bed', 'crib', 'bunk bed',
    // Other
    'lamp', 'clock', 'mirror', 'rug', 'piano', 'tv stand', 'fireplace',
    // Generic
    'furniture', 'decor', 'interior',
  ],

  nature: [
    // Plants
    'tree', 'flower', 'plant', 'bush', 'shrub', 'grass', 'cactus', 'palm tree',
    'oak', 'pine', 'maple', 'rose', 'tulip', 'sunflower', 'daisy',
    // Landscapes
    'mountain', 'hill', 'volcano', 'island', 'beach', 'forest', 'jungle',
    'desert', 'canyon', 'cliff', 'cave', 'waterfall', 'river', 'lake', 'ocean',
    'pond', 'swamp',
    // Weather/Sky
    'sun', 'moon', 'star', 'cloud', 'rainbow', 'lightning',
    // Rocks/Minerals
    'rock', 'boulder', 'crystal', 'gem', 'diamond',
    // Generic
    'nature', 'landscape', 'scenery', 'garden', 'park', 'outdoor',
  ],

  food: [
    // Fruits
    'apple', 'banana', 'orange', 'strawberry', 'grape', 'watermelon', 'pineapple',
    'cherry', 'lemon', 'peach', 'pear',
    // Vegetables
    'carrot', 'broccoli', 'tomato', 'corn', 'potato', 'onion', 'pepper',
    'cucumber', 'lettuce', 'pumpkin',
    // Prepared food
    'pizza', 'burger', 'hamburger', 'hot dog', 'sandwich', 'taco', 'sushi',
    'cake', 'cupcake', 'donut', 'cookie', 'ice cream', 'candy', 'chocolate',
    'bread', 'croissant', 'pie',
    // Drinks
    'cup', 'mug', 'bottle', 'glass', 'coffee', 'tea',
    // Generic
    'food', 'meal', 'snack', 'dessert', 'fruit', 'vegetable',
  ],

  abstract: [
    // Geometric shapes
    'cube', 'sphere', 'pyramid', 'cylinder', 'cone', 'prism', 'hexagon',
    'pentagon', 'octagon', 'spiral', 'helix', 'torus', 'dodecahedron',
    // Abstract concepts
    'abstract', 'geometric', 'pattern', 'mosaic', 'tessellation', 'fractal',
    'sculpture', 'art', 'modern art', 'minimalist',
    // Symbols
    'heart', 'star shape', 'logo', 'symbol', 'letter', 'number', 'word',
    'sign', 'emoji', 'icon',
    // Structures
    'tower', 'wall', 'maze', 'puzzle', 'optical illusion',
  ],
};

/**
 * Category-specific building guidelines.
 * Each guideline is ~200-300 tokens with targeted tips.
 */
export const CATEGORY_GUIDELINES: Record<LegoCategory, string> = {
  vehicles: `
VEHICLE-SPECIFIC BUILDING GUIDELINES:

1. WHEEL PLACEMENT:
   - Place wheels at Y=0 as the foundation
   - Use 2x2 round bricks or cylinders for wheels
   - Space front and rear axles 4-8 studs apart for cars
   - Ensure wheels are symmetrically placed

2. CHASSIS STRUCTURE:
   - Build chassis at Y=1, directly on top of wheels
   - Use long flat bricks (2x6, 2x8) for chassis base
   - Leave wheel wells if wheels are taller than 1 unit

3. BODY PROPORTIONS:
   - Hood/front: 1/4 of total length
   - Cabin/cockpit: 1/3 of total length
   - Trunk/rear: remaining length
   - Keep body width consistent (4-6 studs)

4. AERODYNAMIC DETAILS:
   - Use sloped bricks for windshields and hoods
   - Headlights: 1x1 round plates or translucent bricks
   - Windows: transparent light blue or black

5. COLOR SCHEME:
   - Main body: single bold color
   - Wheels: black or dark gray
   - Accents: silver for details
`,

  buildings: `
BUILDING-SPECIFIC GUIDELINES:

1. FOUNDATION & WALLS:
   - Start with solid baseplate (minimum 8x8 for small buildings)
   - Build walls hollow - place bricks only on perimeter
   - Use staggered brick patterns (never stack directly)
   - Standard wall height: 3-4 brick layers per floor

2. DOOR & WINDOW PLACEMENT:
   - Doors: 1x4 opening at Y=0, centered on front wall
   - Windows: 2x2 or 1x2 openings at Y=2-3
   - Leave empty spaces or use transparent bricks
   - Balance windows symmetrically on facade

3. ROOF CONSTRUCTION:
   - Flat roof: cover with plates, slight overhang (1 stud)
   - Sloped roof: use slope bricks from walls inward
   - Peak should be centered over the building

4. STRUCTURAL DETAILS:
   - Add corner pillars for stability
   - Include internal support walls for larger buildings
   - Connect floors with spanning plates

5. ARCHITECTURAL FEATURES:
   - Chimney: 2x2 bricks stacked on roof corner
   - Steps: stacked plates leading to door
`,

  animals: `
ANIMAL-SPECIFIC BUILDING GUIDELINES:

1. BODY PROPORTIONS:
   - Build from center outward (body first, then limbs)
   - Main body: compact, roughly cubic or oval
   - Head: 1/4 to 1/3 of body size
   - Use real animal proportions, simplified

2. LEG PLACEMENT (CRITICAL):
   - Four-legged: place legs at corners of body
   - Legs directly under body mass for balance
   - Use 1x1 or 1x2 bricks for legs
   - All legs must touch Y=0 simultaneously

3. HEAD & FEATURES:
   - Build head separately, attach at front
   - Eyes: 1x1 round plates or small dots
   - Ears: small plates or slopes on head top
   - Snout/beak: extending forward with slopes

4. TAIL & APPENDAGES:
   - Tails: thin 1x1 brick extension from rear
   - Keep appendages short to avoid cantilever
   - Wings: plates close to body

5. COLOR MATCHING:
   - Use realistic animal colors
   - Eyes: black with white highlight
`,

  characters: `
CHARACTER-SPECIFIC BUILDING GUIDELINES:

1. FIGURE PROPORTIONS (MINIFIG-INSPIRED):
   - Total height: 6-8 brick layers
   - Head: 2 layers (round or square)
   - Torso: 2-3 layers (widest part)
   - Legs: 2-3 layers (taper down)

2. HEAD CONSTRUCTION:
   - Use 2x2 or 3x3 base for head
   - Face: 1x1 round plates for eyes
   - Use yellow, tan, or brown for skin
   - Hair: plates on top

3. BODY & ARMS:
   - Torso: 4-6 studs wide, solid
   - Arms: 1x1 bricks from sides at Y=3-4
   - Keep arms short (2-3 studs) for stability
   - Hands: optional 1x1 round plates

4. LEGS & STANCE:
   - Build legs as 2-wide base or two 1x2 columns
   - Wide stance (2-4 studs apart)
   - Feet: 2x2 or 2x3 plates at Y=0

5. ACCESSORIES:
   - Hats: slopes or rounded bricks on head
   - Tools: simple 1xN brick attachments
`,

  furniture: `
FURNITURE-SPECIFIC BUILDING GUIDELINES:

1. SCALE & PROPORTIONS:
   - Design for minifig scale (1 brick = ~1 foot)
   - Chair seat height: 2 bricks
   - Table height: 4 bricks
   - Bed length: 6-8 studs

2. STRUCTURAL STABILITY:
   - Wide bases (wider than tall)
   - Legs: minimum 2x2 footprint each
   - Connect legs with horizontal supports
   - Top surfaces: solid plates

3. CHAIR CONSTRUCTION:
   - Seat: flat plate (2x4 minimum)
   - Backrest: vertical bricks behind seat
   - All four legs must touch ground evenly

4. TABLE CONSTRUCTION:
   - Top: single large plate or connected plates
   - Legs at corners, not edges
   - Stretchers between legs

5. FUNCTIONAL FEATURES:
   - Drawers: contrasting color insets
   - Cushions: different colored top layer
`,

  nature: `
NATURE-SPECIFIC BUILDING GUIDELINES:

1. TREE CONSTRUCTION:
   - Trunk: 2x2 brown bricks, 3-5 layers tall
   - Crown: green bricks in expanding layers
   - Start narrow at top, widen downward
   - Root base: wider than trunk

2. FLOWER BUILDING:
   - Stem: 1x1 green brick column
   - Petals: plates arranged radially
   - Use bright colors: red, yellow, pink
   - Center: contrasting 1x1 round plate

3. LANDSCAPE ELEMENTS:
   - Mountains: triangular profile with slopes
   - Rocks: irregular stacked gray bricks
   - Water: flat blue plates at base
   - Grass: green plate base

4. ORGANIC SHAPES:
   - Vary brick placement slightly
   - Use multiple greens for foliage
   - Brown/tan for earth tones

5. SCENE COMPOSITION:
   - Larger elements in back
   - Use baseplate as ground
`,

  food: `
FOOD-SPECIFIC BUILDING GUIDELINES:

1. SCALE CONSIDERATIONS:
   - Build larger than real scale for detail
   - Typical fruit: 3x3x3 stud volume
   - Plate/bowl: 4x4 to 6x6 base
   - Focus on recognizable silhouettes

2. FRUIT & VEGETABLES:
   - Round shapes: spheres from cube-stacked bricks
   - Apple: red 3x3, indent top with green leaf
   - Banana: yellow curved using offset stacking
   - Carrot: orange triangle (wide to narrow)

3. PREPARED FOOD:
   - Pizza: circular tan base, colorful toppings
   - Burger: stacked layers (bun-patty-cheese-bun)
   - Cake: tiered cylinders with frosting color
   - Ice cream: cone + spherical scoops

4. COLOR ACCURACY:
   - Bread/buns: tan or light brown
   - Cheese: yellow
   - Lettuce: bright green
   - Meat: reddish-brown

5. PRESENTATION:
   - Place food on contrasting plate
   - White plates show colors best
`,

  abstract: `
ABSTRACT/GEOMETRIC BUILDING GUIDELINES:

1. GEOMETRIC PRECISION:
   - Use consistent angles and proportions
   - Symmetry is key for geometric shapes
   - Align edges along grid
   - Count studs for equal dimensions

2. BASIC SHAPES:
   - Cube: equal W x D x H
   - Pyramid: square base, converging with slopes
   - Sphere: staggered circular layers
   - Cylinder: circular cross-section, consistent width

3. PATTERN CREATION:
   - Repeat elements consistently
   - Contrasting colors for interest
   - Regular spacing between elements
   - Color gradients for flow

4. SCULPTURAL FORMS:
   - Start with core structure
   - Build outward in balanced extensions
   - Negative space can be intentional
   - Center of gravity over base

5. COLOR THEORY:
   - Complementary: red/green, blue/orange
   - Monochromatic: shades of single color
   - Rainbow sequences for gradients
`,

  general: `
GENERAL LEGO BUILDING GUIDELINES:

1. START WITH THE BASE:
   - Begin with widest, most stable part
   - Build foundation before details
   - Base at least 1/3 model width

2. WORK IN LAYERS:
   - Complete each horizontal layer before moving up
   - Stagger joints between layers
   - Check stability at each level

3. BALANCE & SYMMETRY:
   - Distribute weight evenly
   - Balance features on both sides
   - Keep center of gravity over base

4. USE APPROPRIATE BRICK SIZES:
   - Large bricks (2x4, 2x6) for structure
   - Small bricks (1x1, 1x2) for details only
   - Fewer bricks = stronger structure

5. COLOR PLANNING:
   - Decide colors before building
   - Use 2-3 main colors maximum
   - Add accent colors sparingly
`,
};

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detects the LEGO category from a user prompt.
 *
 * Uses keyword matching with word boundaries to avoid partial matches.
 * Longer/more specific keywords take precedence.
 *
 * @param prompt - The user's text prompt
 * @returns The detected category, or 'general' if no match
 */
export function detectCategory(prompt: string): LegoCategory {
  const normalizedPrompt = prompt.toLowerCase().trim();

  // Track best match with specificity (keyword length)
  let bestMatch: { category: LegoCategory; specificity: number } | null = null;

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Word boundary matching to avoid partial matches
      const regex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');

      if (regex.test(normalizedPrompt)) {
        const specificity = keyword.length;

        if (!bestMatch || specificity > bestMatch.specificity) {
          bestMatch = {
            category: category as LegoCategory,
            specificity,
          };
        }
      }
    }
  }

  return bestMatch?.category || 'general';
}

/**
 * Gets the building guidelines for a specific category.
 */
export function getCategoryGuidelines(category: LegoCategory): string {
  return CATEGORY_GUIDELINES[category];
}

/**
 * Gets the brick count range for a specific category.
 */
export function getCategoryBrickCount(category: LegoCategory): { min: number; max: number } {
  return CATEGORY_BRICK_COUNTS[category];
}

/**
 * Detects category and returns all relevant data.
 * Convenience function for the API route.
 *
 * @param prompt - The user's text prompt
 * @returns Object containing detected category, guidelines, and brick counts
 */
export function getGuidelinesForPrompt(prompt: string): {
  category: LegoCategory;
  guidelines: string;
  brickCount: { min: number; max: number };
} {
  const category = detectCategory(prompt);
  return {
    category,
    guidelines: CATEGORY_GUIDELINES[category],
    brickCount: CATEGORY_BRICK_COUNTS[category],
  };
}
