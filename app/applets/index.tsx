import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Collapsible, ListRow, space, type, useTheme, Button, Pill, SubScreen } from '@/ui';
import { emptyApplet, loadApplets, saveApplets, type AppletDef } from '@/api/applets';

export default function AppletListScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [list, setList] = useState<AppletDef[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setList(await loadApplets());
      setLoaded(true);
    })();
  }, []);

  const persist = useCallback(async (next: AppletDef[]) => {
    setList(next);
    await saveApplets(next);
  }, []);

  const create = useCallback(async () => {
    const def = emptyApplet();
    await persist([def, ...list]);
    router.push(`/applets/${def.id}`);
  }, [list, persist, router]);

  const toggle = useCallback(
    async (id: string) => {
      await persist(list.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
    },
    [list, persist],
  );

  const remove = useCallback(
    async (id: string) => {
      await persist(list.filter((a) => a.id !== id));
    },
    [list, persist],
  );

  return (
    <SubScreen title="功能应用" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, ...type.caption, lineHeight: 19, marginBottom: space.lg }}>
          功能应用是可被 AI 调用的轻量脚本。应用体形如
          <Text style={{ color: primary }}> return async (ctx, args) {'=>'} {'{ … }'}</Text>
          ，可用 ctx.ai / ctx.fetch / ctx.storage / ctx.log。
        </Text>

        <Button title="新建功能应用" icon="add" onPress={create} />

        <View style={{ height: space.xl }} />

        {loaded && list.length === 0 ? (
          <Text style={{ color: palette.textFaint, ...type.caption, textAlign: 'center', paddingVertical: space.xxl }}>
            还没有功能应用，点击上方新建。
          </Text>
        ) : null}

        <View style={{ gap: space.md }}>
          {list.map((a) => (
            <View key={a.id} style={{ gap: space.sm }}>
              <ListRow
                icon={a.enabled ? 'flash' : 'flash-off'}
                title={a.name}
                subtitle={a.description || '未填写说明'}
                value={a.enabled ? '已启用' : '已停用'}
                onPress={() => router.push(`/applets/${a.id}`)}
              />
              <View style={{ flexDirection: 'row', gap: space.sm, paddingHorizontal: space.xs }}>
                <View style={{ flex: 1 }}>
                  <Button title={a.enabled ? '停用' : '启用'} small variant="secondary" onPress={() => toggle(a.id)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button title="删除" small variant="danger" onPress={() => remove(a.id)} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: space.xl }} />
        <Collapsible
          title="调用说明"
          body="在对话中输入 @功能应用名 参数，即可让 AI 调用该功能应用；也可在功能应用详情页手动填写参数运行。AI 调用结果会直接显示在消息流中。"
          expanded={helpOpen}
          onToggle={() => setHelpOpen((v) => !v)}
          trailing={<Ionicons name="information-circle-outline" size={18} color={palette.textFaint} />}
        />
        <View style={{ height: space.lg }} />
        <Pill text={`共 ${list.length} 个功能应用`} icon="apps-outline" />
      </View>
    </SubScreen>
  );
}
