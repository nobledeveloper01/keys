import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { attempt, client, type ConditionRecordView, type RoomChange } from '@keys/api';
import { PROMPTS, ROOM_TEMPLATES, unchanged } from '@keys/domain';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Chip } from '../components/Chip';
import { Choice } from '../components/Choice';
import { Field } from '../components/Field';
import { ScreenHeader } from '../components/ScreenHeader';
import { Text } from '../components/Text';
import { Unready } from '../components/Unready';
import { space } from '../design/tokens';
import KeysCapture from '../native/NativeKeysCapture';
import { decodeBase64 } from '../state/base64';
import { useLanguage } from '../state/language';
import { useQuery } from '../state/server';
import { sha256 } from '../state/sha256';
import { signAsLetting, signAsTenant } from '../state/signing';

type Party = 'tenant' | 'letting';
type Item = { caption: string; photoHash: string; verdict: 'snag' | 'fine' };
type Room = { name: string; items: Item[] };

/**
 * The condition record (ADR-0011): Snag's walk on a Keys phone. A template
 * names the rooms; a prompt starts a caption; every photograph is hashed the
 * moment it is taken and the hash is what the record holds. A draft either
 * party may change; a record both have signed nothing changes. The move-out
 * is shown beside the move-in as a list of differences and never a number.
 */
export function ConditionScreen({ baseUrl, token, as, tenancyId, onBack }: { baseUrl: string; token: string; as: Party; tenancyId: string; onBack: () => void }) {
  const { t } = useLanguage();
  const options = as === 'tenant' ? { baseUrl, tenantToken: token } : { baseUrl, agentToken: token };
  const api = () => client(options).tenancy;
  const { query, refresh } = useQuery<ConditionRecordView[]>(() => attempt(() => api().records(tenancyId)), [baseUrl, token, tenancyId]);
  const records = query.state === 'ready' ? query.value : null;
  const moveIn = records?.find((r) => r.walk === 'move_in') ?? null;
  const moveOut = records?.find((r) => r.walk === 'move_out') ?? null;

  const [problem, setProblem] = useState<string | null>(null);
  const [walk, setWalk] = useState<'move_in' | 'move_out' | null>(null);
  const [template, setTemplate] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [caption, setCaption] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [changes, setChanges] = useState<RoomChange[] | null>(null);

  function refused(r: { ok: false; failure: { kind: string; detail?: string } }) {
    setProblem(r.failure.kind === 'refused' ? (r.failure.detail ?? t('try_again')) : t('no_signal_nothing_sent'));
  }

  function start(which: 'move_in' | 'move_out') {
    setWalk(which);
    setTemplate(null);
    setRooms(which === 'move_out' && moveIn ? moveIn.rooms.map((r) => ({ name: r.name, items: [] })) : []);
  }

  function choose(id: string) {
    setTemplate(id);
    setRooms((ROOM_TEMPLATES[id] ?? []).map((name) => ({ name, items: [] })));
  }

  async function photograph(roomName: string, verdict: 'snag' | 'fine') {
    setProblem(null);
    let taken: { pixels: string };
    try {
      taken = await KeysCapture.capture('photo');
    } catch (error) {
      setProblem(error instanceof Error ? error.message : t('try_again'));
      return;
    }
    const photoHash = sha256(decodeBase64(taken.pixels));
    const text = caption.trim() || roomName;
    setRooms((rs) => rs.map((r) => (r.name === roomName ? { ...r, items: [...r.items, { caption: text, photoHash, verdict }] } : r)));
    setCaption('');
  }

  async function save() {
    setProblem(null);
    const body = { rooms, takenAt: new Date().toISOString() };
    const r = editing
      ? await attempt(() => api().replaceRecord(editing, body))
      : await attempt(() => api().startRecord(tenancyId, { walk: walk ?? 'move_in', ...(walk === 'move_out' && moveIn ? { comparesTo: moveIn.id } : {}), ...body }));
    if (!r.ok) return refused(r);
    setWalk(null);
    setEditing(null);
    refresh();
  }

  async function acknowledge(record: ConditionRecordView) {
    setProblem(null);
    const signed = as === 'tenant' ? await signAsTenant(baseUrl, token, record.message) : await signAsLetting(baseUrl, token, record.message);
    if ('why' in signed) return setProblem(signed.why);
    const r = await attempt(() => api().acknowledge(record.id, signed.signature, signed.deviceId));
    if (!r.ok) return refused(r);
    refresh();
  }

  async function compare(record: ConditionRecordView) {
    setProblem(null);
    const r = await attempt(() => api().compare(record.id));
    if (!r.ok) return refused(r);
    setChanges(r.value);
  }

  function edit(record: ConditionRecordView) {
    setEditing(record.id);
    setWalk(record.walk === 'move_out' ? 'move_out' : 'move_in');
    setTemplate('custom');
    setRooms(record.rooms.map((r) => ({ name: r.name, items: r.items.map((i) => ({ caption: i.caption, photoHash: i.photoHash, verdict: i.verdict === 'snag' ? 'snag' : 'fine' })) })));
  }

  const walking = walk !== null;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <ScreenHeader title={t('walk_record')} onBack={walking ? () => setWalk(null) : onBack} />
      <Text variant="body" tone="secondary">
        {t('walk_record_lede')}
      </Text>
      <Unready query={query} onRetry={refresh} />
      {problem !== null && (
        <Text variant="body" tone="caution">
          {problem}
        </Text>
      )}

      {!walking &&
        records !== null &&
        records.map((record) => (
          <Card key={record.id} overline={t(record.walk === 'move_in' ? 'walk_move_in' : 'walk_move_out')} icon="camera">
            <Text variant="body">{`${record.takenAt.slice(0, 10)} · ${record.rooms.length} · ${record.rooms.reduce((n, r) => n + r.items.length, 0)}`}</Text>
            <Text variant="label" tone={record.acknowledgedByBoth ? 'clear' : 'secondary'}>
              {record.acknowledgedByBoth ? t('acknowledged_both') : record.acknowledgements.length === 1 ? t('acknowledged_one') : t('draft')}
            </Text>
            {record.rooms.map((room) => (
              <View key={room.name} style={styles.row}>
                <Text variant="label">{room.name}</Text>
                {room.items.map((item, i) => (
                  <Text key={i} variant="body" tone={item.verdict === 'snag' ? 'caution' : 'secondary'}>{`${item.caption} · ${t(item.verdict === 'snag' ? 'verdict_snag' : 'verdict_fine')}`}</Text>
                ))}
              </View>
            ))}
            {record.acknowledgements.length === 0 && <Button label={t('save_draft')} onPress={() => edit(record)} quiet />}
            {!record.acknowledgedByBoth && <Button label={t('acknowledge')} onPress={() => void acknowledge(record)} />}
            {record.walk === 'move_out' && <Button label={t('compare')} onPress={() => void compare(record)} quiet />}
          </Card>
        ))}

      {!walking && changes !== null && (
        <Card overline={t('compare')} icon="swap">
          {unchanged(changes) ? (
            <Text variant="body" tone="clear">
              {t('unchanged')}
            </Text>
          ) : (
            changes.map((c) => (
              <View key={c.room} style={styles.row}>
                <Text variant="label">{c.room}</Text>
                {c.newSnags.length > 0 && <Text variant="body" tone="caution">{`${t('new_snags')}: ${c.newSnags.join(', ')}`}</Text>}
                {c.fixed.length > 0 && <Text variant="body" tone="clear">{`${t('fixed_since')}: ${c.fixed.join(', ')}`}</Text>}
                {c.missing.length > 0 && <Text variant="body" tone="caution">{`${t('missing_since')}: ${c.missing.join(', ')}`}</Text>}
                {c.added.length > 0 && <Text variant="body" tone="secondary">{`${t('added_since')}: ${c.added.join(', ')}`}</Text>}
              </View>
            ))
          )}
        </Card>
      )}

      {!walking && records !== null && !moveIn && <Button label={t('start_move_in')} onPress={() => start('move_in')} />}
      {!walking && moveIn?.acknowledgedByBoth && !moveOut && <Button label={t('start_move_out')} onPress={() => start('move_out')} />}

      {walking && (
        <>
          {template === null && walk === 'move_in' ? (
            <Card overline={t('pick_rooms')}>
              <Choice options={Object.keys(ROOM_TEMPLATES).map((id) => ({ id, label: id.replace(/_/g, ' ') }))} chosen={template} onChoose={choose} />
            </Card>
          ) : (
            <>
              <Field label={t('caption')} value={caption} onChange={setCaption} />
              <View style={styles.chips}>
                {PROMPTS.map((p) => (
                  <Chip key={p} label={p} selected={caption === p} onPress={() => setCaption(p)} />
                ))}
              </View>
              {rooms.map((room) => (
                <Card key={room.name} overline={room.name} icon="camera">
                  {room.items.map((item, i) => (
                    <Text key={i} variant="body" tone={item.verdict === 'snag' ? 'caution' : 'secondary'}>{`${item.caption} · ${t(item.verdict === 'snag' ? 'verdict_snag' : 'verdict_fine')}`}</Text>
                  ))}
                  <View style={styles.pair}>
                    <Button label={`${t('add_item')} · ${t('verdict_snag')}`} onPress={() => void photograph(room.name, 'snag')} quiet />
                    <Button label={`${t('add_item')} · ${t('verdict_fine')}`} onPress={() => void photograph(room.name, 'fine')} quiet />
                  </View>
                </Card>
              ))}
              <Button label={t('save_draft')} onPress={() => void save()} disabled={rooms.every((r) => r.items.length === 0)} />
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: space.lg, gap: space.md },
  row: { gap: space.xs, paddingVertical: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  pair: { gap: space.xs },
});
