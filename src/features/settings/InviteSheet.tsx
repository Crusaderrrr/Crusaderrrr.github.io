import { useEffect, useState } from 'react';
import { createInvite, inviteLink } from '../../api/auth';
import Sheet from '../../components/Sheet';
import { btn } from '../../components/ui';

/** Owner only: mints a single-use code and offers it as a sign-up link. */
export default function InviteSheet({ onClose }: { onClose: () => void }) {
  const [link, setLink] = useState('');
  const [status, setStatus] = useState('Creating invite…');

  useEffect(() => {
    let cancelled = false;
    createInvite().then(
      (code) => {
        if (cancelled) return;
        setLink(inviteLink(code));
        setStatus('');
      },
      (e: unknown) => !cancelled && setStatus(`Could not create invite: ${e instanceof Error ? e.message : e}`),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Trust The Process', text: 'Join me on TTP:', url: link });
      else {
        await navigator.clipboard.writeText(link);
        setStatus('Link copied.');
      }
    } catch (e) {
      // Dismissing the share sheet rejects with AbortError; that is not an error worth showing.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setStatus(`Could not share: ${e}`);
    }
  };

  return (
    <Sheet title="Invite a friend" onClose={onClose}>
      <div className="flex flex-col gap-3 pb-2">
        {link && (
          <>
            <p className="rounded-xl bg-neutral-800/80 px-3.5 py-3 text-sm break-all text-neutral-100 select-text">{link}</p>
            <p className="px-1 text-xs text-neutral-500">Works once, for one person. Send it privately.</p>
            <button className={btn.primary} onClick={() => void share()}>
              {typeof navigator.share === 'function' ? 'Share link' : 'Copy link'}
            </button>
          </>
        )}
        {status && <p className="px-1 text-sm text-neutral-300">{status}</p>}
      </div>
    </Sheet>
  );
}
