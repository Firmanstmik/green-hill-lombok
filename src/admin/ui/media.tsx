import type { ImgHTMLAttributes } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepository } from '../AdminSession';
import { isPrivateRef } from '../domain/media';

/**
 * Turns stored media values into URLs the admin can display. Public URLs and
 * local data URLs pass through; private references become signed URLs.
 */
export function useMediaUrls(refs: string[]): Record<string, string> {
  const repository = useRepository();
  const unique = [...new Set(refs.filter(Boolean))].sort();
  const privateRefs = unique.filter(isPrivateRef);
  const query = useQuery({
    queryKey: ['gh-admin', repository.mode, 'media', privateRefs],
    queryFn: () => repository.resolveMedia(privateRefs),
    enabled: privateRefs.length > 0,
    staleTime: 45 * 60 * 1000,
  });
  const out: Record<string, string> = {};
  for (const ref of unique) {
    const url = isPrivateRef(ref) ? query.data?.[ref] : ref;
    if (url) out[ref] = url;
  }
  return out;
}

export function useMediaUrl(ref: string): string {
  return useMediaUrls(ref ? [ref] : [])[ref] ?? '';
}

/** An <img> for a stored media value. Renders nothing until a URL is available. */
export function MediaImg({ src, ...rest }: Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & { src: string }) {
  const url = useMediaUrl(src);
  if (!url) return null;
  return <img src={url} {...rest} />;
}
