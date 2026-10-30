import { useState } from 'react';
import Sheet from '../../components/Sheet';
import { btn, card, PageHeader, Row, SectionTitle } from '../../components/ui';
import { formatRest, REST_OPTIONS } from '../../domain/workout';
import { useDbQuery } from '../../hooks/useDbQuery';
import { getDefaultRest, setDefaultRest } from '../../repositories/exercises';
import { useAuth } from '../auth/AuthGate';
import InviteSheet from './InviteSheet';

export default function SettingsScreen() {
  const [message, setMessage] = useState('');
  const defaultRest = useDbQuery(getDefaultRest, []);
  const [restSheet, setRestSheet] = useState(false);
  const { user, logout } = useAuth();
  const [inviteSheet, setInviteSheet] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Settings" />

      <section className="flex flex-col gap-2">
        <SectionTitle>Account</SectionTitle>
        <div className={`${card} overflow-hidden`}>
          <Row icon="check" iconBg="bg-green-600" title="Signed in as" detail={user.username} />
        </div>
        {user.isAdmin && (
          <button className={btn.secondary} onClick={() => setInviteSheet(true)}>
            Invite a friend
          </button>
        )}
        <button
          className={btn.danger}
          onClick={() =>
            confirm('Log out of this device?') && void logout().catch((e: unknown) => setMessage(`Log out failed: ${e}`))
          }
        >
          Log out
        </button>
        {message && <p className="px-1 text-sm text-neutral-300">{message}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Workout</SectionTitle>
        <div className={`${card} overflow-hidden`}>
          <Row
            icon="timer"
            iconBg="bg-green-600"
            title="Default rest timer"
            detail={defaultRest === undefined ? '' : formatRest(defaultRest)}
            onClick={() => setRestSheet(true)}
            chevron
          />
        </div>
        <p className="px-1 text-xs text-neutral-500">
          Used by every exercise unless you set its rest timer during a workout.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>About</SectionTitle>
        <div className={`${card} overflow-hidden`}>
          <Row icon="settings" iconBg="bg-neutral-600" title="Build" detail={new Date(__BUILD_TIME__).toLocaleString('en-GB')} />
        </div>
        <p className="px-1 text-xs text-neutral-500">
          Trust The Process · Exercise photos: free-exercise-db (public domain) · Icons: Material Symbols
        </p>
      </section>

      {inviteSheet && <InviteSheet onClose={() => setInviteSheet(false)} />}

      {restSheet && (
        <Sheet title="Default rest timer" onClose={() => setRestSheet(false)}>
          <div className="grid grid-cols-3 gap-2 pb-2">
            {REST_OPTIONS.map((s) => (
              <button
                key={s}
                className={`${btn.chip(s === defaultRest)} py-3 text-base`}
                onClick={async () => {
                  await setDefaultRest(s);
                  setRestSheet(false);
                }}
              >
                {formatRest(s)}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}
