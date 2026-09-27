import type { ReactNode } from 'react';

/**
 * Green Hill headline signature: the closing full stop set in gold, echoing the
 * gold ampersand of the hero. Text stays exactly as written (CMS / translations);
 * only its final punctuation mark is coloured.
 */
export function withGoldStop(text: string): ReactNode {
  const match = text.match(/^([\s\S]*?)([.!?])$/);
  if (!match) return text;
  return (
    <>
      {match[1]}
      <span className="gh-stop">{match[2]}</span>
    </>
  );
}
