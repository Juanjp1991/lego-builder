# Story 1.4: Add Loading States and Progress Storytelling

Status: ready-for-dev

## Story

As a user,
I want to see engaging loading states during AI operations,
So that wait times feel like progress rather than delay.

## Acceptance Criteria

1. **Given** an AI operation is in progress **When** the loading component is active **Then** progress storytelling displays with phase transitions: "Imagining... Finding... Building..." (FR20)
2. **And** a skeleton/shimmer shows in the 3D viewer area during loading
3. **And** the loading state is accessible with screen reader announcements
4. **And** the component supports reduced motion preferences
5. **And** loading phases transition smoothly with appropriate timing
6. **And** the component is reusable across all AI operations (generation, scanning)

## Tasks / Subtasks

- [ ] **Task 1: Create LoadingState Component** (AC: #1, #2)
  - [ ] Create `src/components/shared/LoadingState.tsx` with progress storytelling
  - [ ] Define type `LoadingPhase = 'imagining' | 'finding' | 'building'`
  - [ ] Implement animated phase transitions with 3-5 second intervals
  - [ ] Include skeleton shimmer as background
  - [ ] Create co-located test file `LoadingState.test.tsx`

- [ ] **Task 2: Create Type Definitions** (AC: #1)
  - [ ] Add loading types to `src/types/loading.ts`
  - [ ] Define `LoadingPhase` type for storytelling states
  - [ ] Define `LoadingStateProps` interface with phase, message, className

- [ ] **Task 3: Implement Accessibility Features** (AC: #3, #4)
  - [ ] Add `aria-live="polite"` for phase change announcements
  - [ ] Add `role="status"` for screen reader support
  - [ ] Implement `prefers-reduced-motion` CSS media query
  - [ ] Provide static fallback when motion is reduced
  - [ ] Add sr-only text for current phase

- [ ] **Task 4: Create Animation System** (AC: #5)
  - [ ] Implement CSS animations for phase transitions (fade/slide)
  - [ ] Create building blocks micro-animation for visual interest
  - [ ] Ensure animations are performant (GPU-accelerated transforms)
  - [ ] Add Tailwind animation utilities to config if needed

- [ ] **Task 5: Export Shared Components** (AC: #6)
  - [ ] Create `src/components/shared/index.ts` barrel export
  - [ ] Ensure LoadingState is exported for use across features

- [ ] **Task 6: Create Integration Examples** (AC: #6)
  - [ ] Document usage patterns in component TSDoc
  - [ ] Add usage example for AI generation context
  - [ ] Add usage example for scanning context

## Dev Notes

### Previous Story Intelligence

**From Story 1-3 (3D Model Viewer):**
- Skeleton shimmer pattern: `className="animate-pulse bg-muted rounded-lg"`
- Loading states use `ViewerState` type pattern: `'loading' | 'ready' | 'error'`
- Co-located tests essential – set up cleanup in afterEach for DOM pollution
- 39 unit tests pass across viewer components – maintain test coverage standard
- Use `cn()` from `@/lib/utils` for className merging
- Iframe has skeleton overlay during loading – coordinate with viewer loading

**From Story 1-2 (Testing Infrastructure):**
- Vitest 4.x + @testing-library/react for component testing
- Coverage maintained via test patterns
- Use `screen.getByRole()` and `screen.getByText()` for accessible queries

**From Story 1-1 (PWA Initialization):**
- Next.js 16.1.1, React 19.2.3, TypeScript strict mode
- Tailwind configured with custom theme colors
- Theme colors available: Primary blue, Accent yellow via CSS variables

### Architecture Compliance

**From Architecture Document:**

```typescript
// Progress Storytelling type from architecture
type GenerationPhase = 
  | 'imagining'   // "Imagining your creation..."
  | 'finding'     // "Finding the perfect bricks..."
  | 'building';   // "Building your model..."
```

**Loading States Pattern:**
```typescript
type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

// Every async operation uses this pattern
const [status, setStatus] = useState<AsyncStatus>('idle');
```

**Error Recovery Pattern:**
- LoadingState should handle timeout scenarios gracefully
- Provide callback for timeout after MAX generation time (~1 minute)

### Technical Requirements

**From Project Context (project-context.md):**

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI Library |
| TypeScript | Latest (strict) | Type Safety |
| Tailwind CSS | Latest | Styling with animations |
| Vitest | Latest | Unit Testing |

**Naming Conventions:**
- Component files: PascalCase → `LoadingState.tsx`
- Type files: kebab-case → `loading.ts` in `src/types/`
- Test files: Same as source + `.test` → `LoadingState.test.tsx`

**Project Structure (where to put files):**
```
src/
├── components/
│   └── shared/              # THIS STORY - shared UI components
│       ├── LoadingState.tsx
│       ├── LoadingState.test.tsx
│       └── index.ts
└── types/
    └── loading.ts           # Loading type definitions
```

### UX Requirements

**From UX Design Specification:**

**Progress Storytelling Pattern:**
| Phase | Message | Timing |
|-------|---------|--------|
| **Imagining** | "Imagining your creation..." | 0-3 seconds |
| **Finding** | "Finding the perfect bricks..." | 3-6 seconds |
| **Building** | "Building your model..." | 6+ seconds |

**Loading State Styling:**
- Skeleton shimmer: pulse animation on muted background
- Spacing: 8px grid system
- Border radius: 12px for cards/containers
- Glass morphism optional for overlay contexts

**Accessibility Requirements:**
- ✅ `prefers-reduced-motion` support – static fallback
- ✅ Screen reader announcements on phase change
- ✅ 16px minimum text size for messages

**Animation Guidelines:**
- GPU-accelerated transforms (translate, scale, opacity)
- Avoid animating layout properties (width, height)
- Building blocks micro-animation for playful feel

### Sample Implementation Patterns

**LoadingState.tsx structure:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { LoadingPhase, LoadingStateProps } from '@/types/loading';

const PHASE_MESSAGES: Record<LoadingPhase, string> = {
  imagining: 'Imagining your creation...',
  finding: 'Finding the perfect bricks...',
  building: 'Building your model...',
};

const PHASE_SEQUENCE: LoadingPhase[] = ['imagining', 'finding', 'building'];
const PHASE_DURATION_MS = 3000;

export function LoadingState({ 
  initialPhase = 'imagining',
  className,
  onTimeout,
}: LoadingStateProps) {
  const [phase, setPhase] = useState<LoadingPhase>(initialPhase);

  useEffect(() => {
    const currentIndex = PHASE_SEQUENCE.indexOf(phase);
    if (currentIndex < PHASE_SEQUENCE.length - 1) {
      const timer = setTimeout(() => {
        setPhase(PHASE_SEQUENCE[currentIndex + 1]);
      }, PHASE_DURATION_MS);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  return (
    <div 
      className={cn('relative w-full aspect-video', className)}
      role="status"
      aria-live="polite"
    >
      {/* Skeleton background */}
      <div className="absolute inset-0 animate-pulse bg-muted rounded-lg" />
      
      {/* Phase message */}
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-lg font-medium text-muted-foreground motion-safe:animate-fade-in">
          {PHASE_MESSAGES[phase]}
        </p>
      </div>
      
      {/* Screen reader announcement */}
      <span className="sr-only">{PHASE_MESSAGES[phase]}</span>
    </div>
  );
}
```

**loading.ts types:**
```typescript
export type LoadingPhase = 'imagining' | 'finding' | 'building';

export interface LoadingStateProps {
  /** Initial phase to display */
  initialPhase?: LoadingPhase;
  /** Additional CSS classes */
  className?: string;
  /** Callback when loading times out (optional) */
  onTimeout?: () => void;
  /** Timeout duration in ms (default: 60000) */
  timeoutMs?: number;
}
```

**Reduced Motion CSS Pattern:**
```css
/* In globals.css or component */
@media (prefers-reduced-motion: reduce) {
  .motion-safe\:animate-fade-in {
    animation: none;
  }
}

/* Or with Tailwind */
.motion-safe:animate-fade-in {
  /* Only animate when motion is allowed */
}
```

### Git Commit Patterns

Recent commits follow conventional commits:
- `feat:` for new features → Use for this story
- `fix:` for bug fixes
- `chore:` for maintenance

Example: `feat: Add loading states with progress storytelling`

### Project Structure Notes

- **Alignment:** Creates new `components/shared/` folder per Architecture spec (already referenced in architecture as shared component location)
- **No conflicts:** LoadingState is a new shared component, no modifications to existing components
- **Boundaries:** Shared components can be imported by any feature folder

### References

- [Source: _bmad-output/project-planning-artifacts/architecture.md#Communication-Patterns] Progress storytelling type
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Loading-States] Loading patterns
- [Source: _bmad-output/project-planning-artifacts/ux-design-specification.md#Progress-Storytelling] Phase messages
- [Source: _bmad-output/project-planning-artifacts/epics.md#Story-1.4] Story requirements
- [Source: _bmad-output/implementation-artifacts/1-3-implement-3d-model-viewer-component.md] Previous story patterns
- [FR20: Loading States] Users can see loading states during AI generation
- [UX Principle: Sustain Excitement] Never break flow; progress storytelling bridges wait times

### Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Use generic "Loading..." text | Use progress storytelling phases |
| Animate layout properties | Use GPU-accelerated transforms |
| Skip reduced motion support | Implement `prefers-reduced-motion` |
| Forget screen reader support | Add aria-live and role="status" |
| Hard-code phase timing | Make timing configurable for testing |
| Put in feature folder | Put in `shared/` for cross-feature use |

### Success Verification Checklist

- [ ] `npm test` passes with new LoadingState component tests
- [ ] LoadingState cycles through phases automatically
- [ ] Skeleton shimmer appears behind phase text
- [ ] Screen reader announces phase changes
- [ ] Reduced motion shows static state (no animations)
- [ ] TypeScript has no errors
- [ ] All files follow naming conventions
- [ ] Component is exported from shared/index.ts

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
