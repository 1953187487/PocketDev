import React, { useCallback, useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { space, type, useTheme, Button, Field, SubScreen } from '@/ui';
import { useAppStore, type Workspace } from '@/store/app';
import { COMMON_DIRS, inspectDir, listDir, requestDirectoryPermission, isSafUri, safName, type LocalDirInfo } from '@/api/localfs';

export default function LocalWorkspaceScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { workspaces, addWorkspace, removeWorkspace, activeWorkspaceId, setActiveWorkspaceId } = useAppStore();

  const [path, setPath] = useState('');
  const [checking, setChecking] = useState(false);
  const [inspect, setInspect] = useState<LocalDirInfo | null>(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string[]>([]);

  const localWs = workspaces.filter((w) => w.kind === 'local');

  const runCheck = useCallback(
    async (p: string) => {
      if (!p.trim()) return;
      setChecking(true);
      setError('');
      const info = await inspectDir(p);
      setInspect(info);
      setChecking(false);
      if (info.readable) {
        setPreview(await listDir(p, 40));
      } else {
        setPreview([]);
        if (info.exists) setError('该路径不是可读目录（可能是文件，或受系统分区存储限制）');
        else setError('路径不存在，请检查输入');
      }
    },
    [],
  );

  const addLocal = useCallback(() => {
    if (!inspect?.readable) return;
    const ws = addWorkspace({ name: inspect.name, kind: 'local', root: inspect.path });
    setActiveWorkspaceId(ws.id);
    setPath('');
    setInspect(null);
    setPreview([]);
  }, [inspect, addWorkspace, setActiveWorkspaceId]);

  const pickSystemDir = useCallback(async () => {
    const uri = await requestDirectoryPermission();
    if (!uri) return;
    await runCheck(uri);
    setPath(uri);
  }, [runCheck]);

  return (
    <SubScreen title="本地目录工作区" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, ...type.caption, lineHeight: 19, marginBottom: space.lg }}>
          选择一个本地目录作为工作区，对话会自动携带该目录路径与文件清单作为上下文。Android 11+ 受系统分区存储限制，部分路径可能不可读。
        </Text>

        <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600', marginBottom: 6 }}>选择目录</Text>
        <Button
          title="选择系统目录（可浏览任意文件夹）"
          icon="folder-open-outline"
          onPress={() => void pickSystemDir()}
        />
        <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 6 }}>快捷目录</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
          {COMMON_DIRS.map((d) => (
            <Button key={d.path} title={d.label} small variant="secondary" onPress={() => { setPath(d.path); void runCheck(d.path); }} />
          ))}
        </View>

        <Field
          label="目录路径"
          value={path}
          onChangeText={(v) => setPath(v)}
          placeholder="/storage/emulated/0/Download"
          keyboardType="default"
        />
        <Button
          title="校验目录"
          icon="checkmark-circle-outline"
          loading={checking}
          onPress={() => void runCheck(path)}
          disabled={!path.trim()}
        />

        {inspect ? (
          <View style={{ marginTop: space.lg, gap: space.sm }}>
            {inspect.readable ? (
              <>
                <Text style={{ color: palette.success, ...type.caption }}>
                  目录可读：{inspect.path}（{inspect.entries} 个条目）
                </Text>
                <Button title="添加为工作区" icon="add" onPress={addLocal} />
              </>
            ) : null}
            {error ? <Text style={{ color: palette.danger, ...type.caption }}>{error}</Text> : null}
            {preview.length ? (
              <View style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: space.md, backgroundColor: palette.surface }}>
                  {preview.map((f) => (
                    <Text key={f} style={{ color: palette.textDim, ...type.mono, marginBottom: 2 }}>
                      {isSafUri(f) ? safName(f) : f}
                    </Text>
                  ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: space.xl }} />
        <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600', marginBottom: space.sm }}>
          已添加的本地工作区
        </Text>
        {localWs.length === 0 ? (
          <Text style={{ color: palette.textFaint, ...type.caption }}>暂无本地工作区</Text>
        ) : null}
        <View style={{ gap: space.md }}>
          {localWs.map((w) => {
            const active = w.id === activeWorkspaceId;
            return (
              <View
                key={w.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  borderWidth: 1,
                  borderColor: active ? primary : palette.border,
                  borderRadius: 12,
                  padding: space.md,
                  backgroundColor: palette.surface,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, ...type.bodyStrong }}>{w.name}</Text>
                  <Text style={{ color: palette.textFaint, ...type.mono, marginTop: 2 }} numberOfLines={1}>
                    {w.root}
                  </Text>
                </View>
                {active ? (
                  <Text style={{ color: primary, ...type.caption }}>使用中</Text>
                ) : null}
                <Button title="使用" small variant="secondary" onPress={() => setActiveWorkspaceId(w.id)} />
                <Button title="移除" small variant="danger" onPress={() => removeWorkspace(w.id)} />
              </View>
            );
          })}
        </View>
      </View>
    </SubScreen>
  );
}
