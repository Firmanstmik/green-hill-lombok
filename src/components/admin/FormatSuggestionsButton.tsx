import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { Editor } from '@tiptap/react';
import type { JSONContent } from '@/lib/tiptap-utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FormatSuggestionsButtonProps {
    editor: Editor | null;
}

const FEATURE_KEYWORDS =
    /bedroom|bathroom|pool|garden|kitchen|terrace|balcony|view|marble|wood|floor|ceiling|garage|sqm|m²|living|dining|suite|closet|laundry|pantry|storage|elevator|rooftop|infinity|jacuzzi|sauna|gym|courtyard|\d+\s*(bed|bath|car|level|stor)/i;

const LOCATION_KEYWORDS =
    /close to|near|minutes|minute|beach|airport|school|hospital|market|road|highway|walking distance|neighborhood|district|city center|downtown|village|surfing|ocean|sea|mountain|rice field|temple|mosque|church|restaurant|cafe|shopping|mall/i;

function paragraph(text: string): JSONContent {
    return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function heading(level: number, text: string): JSONContent {
    return {
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text }],
    };
}

function bulletList(items: string[]): JSONContent {
    return {
        type: 'bulletList',
        content: items.map((item) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
        })),
    };
}

function structureDescription(rawText: string): JSONContent {
    const sentences = rawText
        .split(/(?<=[.!?])\s+|\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    if (sentences.length < 2) {
        // Too short to meaningfully split — return a template
        return {
            type: 'doc',
            content: [
                heading(2, 'Overview'),
                paragraph(rawText.trim()),
                heading(2, 'Key Features'),
                bulletList(['Feature 1', 'Feature 2', 'Feature 3']),
                heading(2, 'Location'),
                paragraph('Describe the location and surroundings...'),
                { type: 'horizontalRule' },
                paragraph('Add a closing summary about the property...'),
            ],
        };
    }

    const intro: string[] = [];
    const features: string[] = [];
    const location: string[] = [];
    const closing: string[] = [];

    sentences.forEach((sentence, i) => {
        if (i < 2 && !FEATURE_KEYWORDS.test(sentence) && !LOCATION_KEYWORDS.test(sentence)) {
            intro.push(sentence);
        } else if (FEATURE_KEYWORDS.test(sentence)) {
            features.push(sentence);
        } else if (LOCATION_KEYWORDS.test(sentence)) {
            location.push(sentence);
        } else if (i >= sentences.length - 1) {
            closing.push(sentence);
        } else {
            if (/\d/.test(sentence)) features.push(sentence);
            else closing.push(sentence);
        }
    });

    const doc: JSONContent = { type: 'doc', content: [] };

    if (intro.length) {
        doc.content!.push(paragraph(intro.join(' ')));
    }

    if (features.length) {
        doc.content!.push(heading(2, 'Key Features'));
        doc.content!.push(bulletList(features));
    }

    if (location.length) {
        doc.content!.push(heading(2, 'Location'));
        doc.content!.push(paragraph(location.join(' ')));
    }

    if (closing.length) {
        doc.content!.push({ type: 'horizontalRule' });
        doc.content!.push(paragraph(closing.join(' ')));
    }

    // If nothing was categorized, at least wrap everything
    if (!doc.content!.length) {
        doc.content!.push(paragraph(rawText.trim()));
    }

    return doc;
}

export function FormatSuggestionsButton({ editor }: FormatSuggestionsButtonProps) {
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingJson, setPendingJson] = useState<JSONContent | null>(null);

    const handleClick = () => {
        if (!editor) return;

        const text = editor.getText();
        if (text.trim().length < 50) {
            toast.error('Add more text before formatting (at least 50 characters)');
            return;
        }

        const structured = structureDescription(text);
        setPendingJson(structured);
        setShowConfirm(true);
    };

    const handleApply = () => {
        if (!editor || !pendingJson) return;
        editor.commands.setContent(pendingJson);
        toast.success('Description formatted into sections');
        setShowConfirm(false);
        setPendingJson(null);
    };

    const handleCancel = () => {
        setShowConfirm(false);
        setPendingJson(null);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-[#17382e] transition-colors mt-2"
            >
                <Sparkles size={14} className="text-emerald-500" />
                <span className="font-medium">Format</span>
            </button>

            <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[#17382e]">Apply Structure</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reorganize your description into structured sections
                            (introduction, features, location, summary). You can undo with Ctrl+Z.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleApply}
                            className="bg-[#17382e] hover:bg-[#17382e]/90"
                        >
                            Apply Structure
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
