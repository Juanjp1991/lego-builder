import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerControls } from './ViewerControls';
import type { ControlAction } from '@/types/viewer';

describe('ViewerControls', () => {
    let onControlMessage: Mock<(action: ControlAction) => void>;

    beforeEach(() => {
        onControlMessage = vi.fn();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders control buttons and interaction hint', () => {
        render(<ViewerControls onControlMessage={onControlMessage} />);

        expect(screen.getByLabelText(/rotate left/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();
        expect(screen.getByText(/Drag to rotate/i)).toBeInTheDocument();
    });

    describe('button interactions', () => {
        it('sends rotate left action on button click', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);
            fireEvent.click(screen.getByLabelText(/rotate left/i));
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'rotate', direction: 'left' });
        });

        it('sends zoom in action on button click', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);
            fireEvent.click(screen.getByLabelText(/zoom in/i));
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'zoom', direction: 'in' });
        });
    });

    describe('mouse interactions', () => {
        it('sends rotate messages when dragging with mouse', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);
            const toolbar = screen.getByRole('toolbar');

            // Start drag
            fireEvent.mouseDown(toolbar, { clientX: 100, clientY: 100 });

            // Move right
            fireEvent.mouseMove(window, { clientX: 150, clientY: 100 });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'rotate', direction: 'right' });

            // Move down
            fireEvent.mouseMove(window, { clientX: 150, clientY: 150 });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'rotate', direction: 'down' });

            // Stop drag
            fireEvent.mouseUp(window);
            fireEvent.mouseMove(window, { clientX: 200, clientY: 150 });
            expect(onControlMessage).toHaveBeenCalledTimes(2); // No new calls
        });

        it('sends zoom messages on mouse wheel', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);
            const toolbar = screen.getByRole('toolbar');

            fireEvent.wheel(toolbar, { deltaY: 100 }); // Zoom out
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'zoom', direction: 'out' });

            fireEvent.wheel(toolbar, { deltaY: -100 }); // Zoom in
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'zoom', direction: 'in' });
        });
    });

    describe('touch interactions', () => {
        it('sends rotate messages when dragging with touch', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);
            const toolbar = screen.getByRole('toolbar');

            // Start touch
            fireEvent.touchStart(toolbar, { touches: [{ clientX: 100, clientY: 100 }] });

            // Move left
            fireEvent.touchMove(window, { touches: [{ clientX: 50, clientY: 100 }] });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'rotate', direction: 'left' });
        });

        it('sends zoom messages when pinching', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);
            const toolbar = screen.getByRole('toolbar');

            // Initial pinch (100px apart)
            fireEvent.touchStart(toolbar, {
                touches: [
                    { clientX: 100, clientY: 100 },
                    { clientX: 200, clientY: 100 }
                ]
            });

            // Pinch inward (50px apart) -> Zoom out
            fireEvent.touchMove(window, {
                touches: [
                    { clientX: 125, clientY: 100 },
                    { clientX: 175, clientY: 100 }
                ]
            });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'zoom', direction: 'out' });

            // Pinch outward (150px apart) -> Zoom in
            fireEvent.touchMove(window, {
                touches: [
                    { clientX: 75, clientY: 100 },
                    { clientX: 225, clientY: 100 }
                ]
            });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'zoom', direction: 'in' });
        });
    });

    describe('keyboard interactions', () => {
        it('sends actions on key presses', () => {
            render(<ViewerControls onControlMessage={onControlMessage} />);

            fireEvent.keyDown(window, { key: 'ArrowLeft' });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'rotate', direction: 'left' });

            fireEvent.keyDown(window, { key: '+' });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'zoom', direction: 'in' });

            fireEvent.keyDown(window, { key: 'r' });
            expect(onControlMessage).toHaveBeenCalledWith({ type: 'reset' });
        });
    });

    it('has accessible touch targets', () => {
        render(<ViewerControls onControlMessage={onControlMessage} />);
        const buttons = screen.getAllByRole('button');
        buttons.forEach(btn => {
            expect(btn.className).toContain('min-h-[44px]');
            expect(btn.className).toContain('min-w-[44px]');
        });
    });
});
