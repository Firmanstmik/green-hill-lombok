import { tiptapJsonToPlainText, type JSONContent } from '@/lib/tiptap-utils';

export async function generateListingDescription(): Promise<{
  description_json: JSONContent;
  description_summary: string;
}> {
  await new Promise((resolve) => setTimeout(resolve, 900));

  const description_json: JSONContent = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Overview' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'This listing is designed for modern luxury living with a focus on comfort, flow, and natural light.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Key Features' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Thoughtful layout with premium finishes' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Indoor-outdoor living with seamless transitions' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Ideal for both personal use and investment potential' }],
              },
            ],
          },
        ],
      },
      { type: 'horizontalRule' },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Location' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Located in a desirable area with strong lifestyle appeal and long-term value.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Request a viewing to experience the space, finishes, and ambiance firsthand.',
          },
        ],
      },
    ],
  };

  const description_summary = tiptapJsonToPlainText(description_json);
  return { description_json, description_summary };
}

