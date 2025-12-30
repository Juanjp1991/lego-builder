/**
 * ImageUpload Component Tests
 *
 * @see Story 2.3: Implement Image-to-Lego Model Generation
 * Tests drag-and-drop, file input, validation, preview, and error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageUpload, MAX_FILE_SIZE, ACCEPTED_TYPES } from './ImageUpload';

describe('ImageUpload', () => {
    const mockOnImageSelect = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Helper to create a mock file
    const createMockFile = (
        name: string,
        type: string,
        size: number = 1024
    ): File => {
        const file = new File(['mock content'], name, { type });
        Object.defineProperty(file, 'size', { value: size });
        return file;
    };

    describe('Rendering', () => {
        it('renders the upload zone', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            expect(screen.getByTestId('image-upload-zone')).toBeInTheDocument();
        });

        it('displays drag-and-drop instructions', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            expect(screen.getByText(/drag.*drop/i)).toBeInTheDocument();
        });

        it('displays browse button', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            // Look for the specific "browse files" button, not the outer zone
            expect(screen.getByText(/browse files/i)).toBeInTheDocument();
        });

        it('has hidden file input', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const input = screen.getByTestId('file-input');
            expect(input).toBeInTheDocument();
            expect(input).toHaveAttribute('type', 'file');
            expect(input).toHaveAttribute('accept', ACCEPTED_TYPES.join(','));
        });
    });

    describe('File Input', () => {
        it('accepts valid PNG file', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.png', 'image/png');
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockOnImageSelect).toHaveBeenCalledWith(file);
            });
        });

        it('accepts valid JPEG file', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.jpg', 'image/jpeg');
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockOnImageSelect).toHaveBeenCalledWith(file);
            });
        });

        it('accepts valid WEBP file', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.webp', 'image/webp');
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockOnImageSelect).toHaveBeenCalledWith(file);
            });
        });

        it('accepts valid HEIC file', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.heic', 'image/heic');
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockOnImageSelect).toHaveBeenCalledWith(file);
            });
        });
    });

    describe('File Validation', () => {
        it('rejects invalid file type and shows error', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.pdf', 'application/pdf');
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByTestId('upload-error')).toBeInTheDocument();
                expect(screen.getByText(/PNG, JPEG, WEBP, or HEIC/i)).toBeInTheDocument();
            });

            expect(mockOnImageSelect).not.toHaveBeenCalled();
        });

        it('rejects file larger than 10MB and shows error', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const largeFile = createMockFile('large.png', 'image/png', 15 * 1024 * 1024);
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [largeFile] } });

            // Error should appear synchronously
            expect(screen.getByTestId('upload-error')).toBeInTheDocument();
            expect(screen.getByText(/smaller than 10MB/i)).toBeInTheDocument();
            expect(mockOnImageSelect).not.toHaveBeenCalled();
        });

        it('accepts file exactly at 10MB limit', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('exact.png', 'image/png', MAX_FILE_SIZE);
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(mockOnImageSelect).toHaveBeenCalledWith(file);
            });
        });
    });

    describe('Image Preview', () => {
        it('displays image preview after valid file selection', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.png', 'image/png');
            const input = screen.getByTestId('file-input');

            // Mock URL.createObjectURL for preview
            const mockUrl = 'blob:mock-url';
            vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockUrl);

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                const preview = screen.getByTestId('image-preview');
                expect(preview).toBeInTheDocument();
                expect(preview).toHaveAttribute('src', mockUrl);
            });
        });

        it('shows "Change Image" button when preview is displayed', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.png', 'image/png');
            const input = screen.getByTestId('file-input');

            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByRole('button', { name: /change image/i })).toBeInTheDocument();
            });
        });

        it('clears preview when "Change Image" is clicked', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.png', 'image/png');
            const input = screen.getByTestId('file-input');

            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                expect(screen.getByTestId('image-preview')).toBeInTheDocument();
            });

            const changeButton = screen.getByRole('button', { name: /change image/i });
            fireEvent.click(changeButton);

            await waitFor(() => {
                expect(screen.queryByTestId('image-preview')).not.toBeInTheDocument();
            });
        });
    });

    describe('Drag and Drop', () => {
        it('shows drag-over state when file is dragged over', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const dropZone = screen.getByTestId('image-upload-zone');

            fireEvent.dragOver(dropZone, {
                dataTransfer: { files: [], types: ['Files'] },
            });

            expect(dropZone).toHaveClass('border-primary');
        });

        it('removes drag-over state when file leaves', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const dropZone = screen.getByTestId('image-upload-zone');

            fireEvent.dragOver(dropZone, {
                dataTransfer: { files: [], types: ['Files'] },
            });

            fireEvent.dragLeave(dropZone);

            expect(dropZone).not.toHaveClass('border-primary');
        });

        it('handles file drop', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.png', 'image/png');
            const dropZone = screen.getByTestId('image-upload-zone');

            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

            fireEvent.drop(dropZone, {
                dataTransfer: {
                    files: [file],
                    types: ['Files'],
                },
            });

            await waitFor(() => {
                expect(mockOnImageSelect).toHaveBeenCalledWith(file);
            });
        });
    });

    describe('Loading State', () => {
        it('disables interaction when loading', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={true} />);

            const dropZone = screen.getByTestId('image-upload-zone');
            expect(dropZone).toHaveClass('opacity-50');
            expect(dropZone).toHaveClass('pointer-events-none');
        });

        it('disables file input when loading', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={true} />);

            const input = screen.getByTestId('file-input');
            expect(input).toBeDisabled();
        });
    });

    describe('Accessibility', () => {
        it('has accessible upload zone with role', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const dropZone = screen.getByTestId('image-upload-zone');
            expect(dropZone).toHaveAttribute('role', 'button');
        });

        it('has aria-label describing the upload action', () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const dropZone = screen.getByTestId('image-upload-zone');
            expect(dropZone).toHaveAttribute('aria-label');
        });

        it('error message has role="alert"', async () => {
            render(<ImageUpload onImageSelect={mockOnImageSelect} isLoading={false} />);

            const file = createMockFile('test.pdf', 'application/pdf');
            const input = screen.getByTestId('file-input');

            fireEvent.change(input, { target: { files: [file] } });

            await waitFor(() => {
                const error = screen.getByTestId('upload-error');
                expect(error).toHaveAttribute('role', 'alert');
            });
        });
    });

    describe('Constants Export', () => {
        it('exports MAX_FILE_SIZE constant', () => {
            expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
        });

        it('exports ACCEPTED_TYPES constant', () => {
            expect(ACCEPTED_TYPES).toContain('image/png');
            expect(ACCEPTED_TYPES).toContain('image/jpeg');
            expect(ACCEPTED_TYPES).toContain('image/webp');
            expect(ACCEPTED_TYPES).toContain('image/heic');
        });
    });
});
