import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Collapsible, space, type, useTheme, Button, Field, SubScreen } from '@/ui';
import { buildArgs, loadApplets, runApplet, saveApplets, type AppletDef, type AppletParam } from '@/api/applets';
import { useAppStore } from '@/store/app';

export default function AppletEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { provider } = useAppStore();

  const [def, setDef] = useState<AppletDef | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string>('');
  const [err, setErr] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await loadApplets();
      const found = list.find((a) => a.id === id) ?? null;
      setDef(found);
      if (found) {
        const vals: Record<string, string> = {};
        for (const p of found.params) vals[p.key] = p.default ?? '';
        setArgValues(vals);
      }
    })();
  }, [id]);

  const patch = useCallback((p: Partial<AppletDef>) => {
    setDef((prev) => (prev ? { ...prev, ...p } : prev));
    setDirty(true);
  }, []);

  const save = useCallback(async () => {
    if (!def) return;
    const list = await loadApplets();
    const next = list.some((a) => a.id === def.id) ? list.map((a) => (a.id === def.id ? def : a)) : [def, ...list];
    await saveApplets(next);
    setDirty(false);
    setErr('');
  }, [def]);

  const run = useCallback(async () => {
    if (!def) return;
    setRunning(true);
    setErr('');
    setResult('');
    const args = buildArgs(def.params, argValues);
    const r = await runApplet(def, provider, args);
    setRunning(false);
    if (r.ok) {
      setResult(typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2));
    } else {
      setErr(r.error || '运行失败');
    }
    if (r.logs.length) setResult((prev) => (prev ? `${prev}\n${r.logs.join('\n')}` : r.logs.join('\n')));
  }, [def, provider, argValues]);

  const addParam = useCallback(() => {
    if (!def) return;
    const p: AppletParam = { key: `arg${def.params.length + 1}`, label: `参数 ${def.params.length + 1}`, type: 'text', default: '' };
    patch({ params: [...def.params, p] });
    setArgValues((v) => ({ ...v, [p.key]: '' }));
  }, [def, patch]);

  const removeParam = useCallback(
    (key: string) => {
      if (!def) return;
      patch({ params: def.params.filter((p) => p.key !== key) });
    },
    [def, patch],
  );

  const header = useMemo(
    () => (
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <View style={{ flex: 1 }}>
          <Button title="保存" small onPress={save} disabled={!dirty} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="运行" small variant="secondary" onPress={run} loading={running} />
        </View>
      </View>
    ),
    [dirty, save, run, running],
  );

  if (!def) {
    return (
      <SubScreen title="功能应用" onBack={() => router.back()}>
        <Text style={{ color: palette.textFaint, ...type.caption, paddingHorizontal: space.lg }}>加载中…</Text>
      </SubScreen>
    );
  }

  return (
    <SubScreen title={def.name || '功能应用'} onBack={() => router.back()} right={header}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Field label="名称" value={def.name} onChangeText={(v) => patch({ name: v })} placeholder="功能应用名称" />
        <Field label="说明" value={def.description} onChangeText={(v) => patch({ description: v })} placeholder="这个功能应用做什么" />

        <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 2 }}>
          应用体
        </Text>
        <Field
          value={def.code}
          onChangeText={(v) => patch({ code: v })}
          multiline
          placeholder={'return async (ctx, args) => {\n  return await ctx.ai(args.text || "你好");\n};'}
        />
        <Text style={{ color: palette.textFaint, ...type.caption, marginBottom: space.lg }}>
          必须返回 async 函数：return async (ctx, args) {'=>'} {'{ … }'}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.sm }}>
          <Text style={{ color: palette.textDim, fontSize: 12, fontWeight: '600' }}>参数</Text>
          <Button title="添加参数" small variant="ghost" icon="add" onPress={addParam} />
        </View>

        {def.params.length === 0 ? (
          <Text style={{ color: palette.textFaint, ...type.caption, marginBottom: space.md }}>暂无参数</Text>
        ) : null}

        {def.params.map((p, i) => (
          <View key={p.key} style={{ marginBottom: space.sm }}>
            <Field
              label={`${p.label}（${p.key}）`}
              value={argValues[p.key] ?? ''}
              onChangeText={(v) => setArgValues((s) => ({ ...s, [p.key]: v }))}
              placeholder={p.default ?? ''}
            />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  title={p.type === 'boolean' ? '切换为文本' : '切换为布尔'}
                  small
                  variant="secondary"
                  onPress={() => patch({ params: def.params.map((x, xi) => (xi === i ? { ...x, type: x.type === 'boolean' ? 'text' : 'boolean' } : x)) })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="删除参数" small variant="danger" onPress={() => removeParam(p.key)} />
              </View>
            </View>
          </View>
        ))}

        <View style={{ height: space.lg }} />

        <Collapsible
          title="可用上下文"
          body="ctx.ai(prompt, system?) 调用当前服务商；ctx.fetch(url, init) 发起 HTTP 请求；ctx.storage.get/set 读写轻量键值；ctx.log(msg) 输出调试日志。"
          expanded={helpOpen}
          onToggle={() => setHelpOpen((v) => !v)}
        />

        <View style={{ height: space.lg }} />

        {err ? (
          <Text style={{ color: palette.danger, ...type.caption, marginBottom: space.sm }}>运行失败：{err}</Text>
        ) : null}
        {result ? (
          <View style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: space.md, backgroundColor: palette.surface }}>
            <Text style={{ color: palette.text, ...type.mono }} selectable>{result}</Text>
          </View>
        ) : null}

        <View style={{ height: space.xxl }} />
        <Button title={dirty ? '保存修改' : '已保存'} onPress={save} disabled={!dirty} />
      </View>
    </SubScreen>
  );
}
