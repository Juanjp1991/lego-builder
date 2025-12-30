import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelViewer } from './ModelViewer';

// Mock HTML scene for testing
const mockHtmlScene = `
<!DOCTYPE html>
<html>
<head><title>Test Scene</title></head>
<body><div id="scene">3D Scene</div></body>
</html>
`;

describe('ModelViewer', () => {
    beforeEach(() => {
        // Mock postMessage on the iframe contentWindow
        // Note: In JSDOM, iframe.contentWindow might need manual mocking
    });

    it('renders with loading skeleton initially', () => {
        render(<ModelViewer htmlScene={mockHtmlScene} />);

        expect(screen.getByTestId('viewer-skeleton')).toBeInTheDocument();
        expect(screen.getByTestId('model-viewer')).toBeInTheDocument();
    });

    it('renders integrated ViewerControls', () => {
        render(<ModelViewer htmlScene={mockHtmlScene} />);
        expect(screen.getByRole('toolbar', { name: /3D Model Controls/i })).toBeInTheDocument();
    });

    it('hides skeleton and shows iframe after load', () => {
        render(<ModelViewer htmlScene={mockHtmlScene} />);

        const iframe = screen.getByTitle('3D Lego Model Viewer');
        fireEvent.load(iframe);

        expect(screen.queryByTestId('viewer-skeleton')).not.toBeInTheDocument();
        expect(iframe).not.toHaveClass('invisible');
    });

    it('detects runtime errors via window message event', async () => {
        const onError = vi.fn();
        render(<ModelViewer htmlScene={mockHtmlScene} onError={onError} />);

        // Simulate error message from iframe
        fireEvent(window, new MessageEvent('message', {
            data: { type: 'runtime_error', message: 'Script crashed' }
        }));

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/Loading issue/i)).toBeInTheDocument();
        expect(onError).toHaveBeenCalled();
    });

    it('detects ready state via window message event', () => {
        const onLoad = vi.fn();
        render(<ModelViewer htmlScene={mockHtmlScene} onLoad={onLoad} />);

        // Simulate ready message from iframe
        fireEvent(window, new MessageEvent('message', {
            data: { type: 'ready' }
        }));

        expect(screen.queryByTestId('viewer-skeleton')).not.toBeInTheDocument();
        expect(onLoad).toHaveBeenCalled();
    });

    it('sends postMessage to iframe when controls are interacted with', () => {
        render(<ModelViewer htmlScene={mockHtmlScene} />);

        const iframe = screen.getByTitle('3D Lego Model Viewer') as HTMLIFrameElement;
        const postMessageSpy = vi.spyOn(iframe.contentWindow!, 'postMessage');

        // Mark as ready so controls are interactive
        fireEvent(window, new MessageEvent('message', { data: { type: 'ready' } }));

        const rotateRight = screen.getByLabelText(/rotate right/i);
        fireEvent.click(rotateRight);

        expect(postMessageSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'rotate', direction: 'right' }),
            '*'
        );
    });

    it('applies custom className', () => {
        render(<ModelViewer htmlScene={mockHtmlScene} className="custom-class" />);
        expect(screen.getByTestId('model-viewer')).toHaveClass('custom-class');
    });

    it('handles retry correctly', () => {
        render(<ModelViewer htmlScene={mockHtmlScene} />);

        // Trigger error
        fireEvent(window, new MessageEvent('message', { data: { type: 'error' } }));
        expect(screen.getByRole('alert')).toBeInTheDocument();

        // Click retry
        const retryButton = screen.getByRole('button', { name: /Try Again/i });
        fireEvent.click(retryButton);

        // Should show loading again
        expect(screen.getByTestId('viewer-skeleton')).toBeInTheDocument();
    });
});
