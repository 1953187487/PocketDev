import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { alpha, radius, space, useTheme } from '@/theme';
import { Button, Divider, EmptyState, Field, Pill, Row, SubScreen } from '@/components/ui';
import { ProgressBar } from '@/ui';
import { downloadModelFile, importModelFile, removeModelFile, formatBytes } from '@/api/models';
import { useAppStore, type LocalModel } from '@/store/app';
import { useI18n } from '@/i18n';

const KIND_LABEL: Record<LocalModel['kind'], { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  llm: { label: '本地对话模型', icon: 'server-outline' },
  translation: { label: '翻译模型', icon: 'language-outline' },
  voice: { label: '语音模型', icon: 'mic-outline' },
};

export default function ModelsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { localModels, addLocalModel, removeLocalModel, prefs, setPrefs } = useAppStore();
  const { t } = useI18n();

  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LocalModel['kind']>('llm');
  const [downloading, setDownloading] = useState(false);
  const [percent, setPercent] = useState(0);
  const [importing, setImporting] = useState(false);

  const doDownload = useCallback(async () => {
    if (!url.trim()) return Alert.alert('提示', '请填写模型文件下载地址');
    setDownloading(true);
    setPercent(0);
    try {
      const fileName = name.trim() || url.split('/').pop()?.split('?')[0] || `model-${Date.now()}.bin`;
      const file = await downloadModelFile(url.trim(), fileName, setPercent);
      addLocalModel({ name: fileName, kind, source: 'download', uri: file.uri, size: file.size });
      setUrl('');
      setName('');
      Alert.alert('完成', '模型下载完成并已加入模型管理');
    } catch (e) {
      Alert.alert('下载失败', (e as Error).message);
    } finally {
      setDownloading(false);
    }
  }, [url, name, kind, addLocalModel]);

  const doImport = useCallback(async () => {
    setImporting(true);
    try {
      const file = await importModelFile();
      if (file) {
        addLocalModel({ name: file.name, kind, source: 'import', uri: file.uri, size: file.size });
        Alert.alert('完成', '模型导入成功');
      }
    } catch (e) {
      Alert.alert('导入失败', (e as Error).message);
    } finally {
      setImporting(false);
    }
  }, [kind, addLocalModel]);

  const doRemove = useCallback((m: LocalModel) => {
    Alert.alert('删除模型', `确定删除「${m.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void removeModelFile(m.uri);
          removeLocalModel(m.id);
        },
      },
    ]);
  }, [removeLocalModel]);

  return (
    <SubScreen title="模型管理" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
          翻译、语音与对话可下载或导入本地模型，在完全离线的环境下使用，最大程度保护隐私。本地模型文件仅保存在设备本地。
        </Text>

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8 }}>功能开关</Text>
        <Row style={{ gap: 10 }}>
          <ToggleCard
            icon="language-outline"
            label="翻译"
            desc="翻译你的文字与 AI 输出"
            value={prefs.translateEnabled}
            onChange={(v) => setPrefs({ translateEnabled: v })}
            palette={palette}
            primary={primary}
          />
          <ToggleCard
            icon="mic-outline"
            label="语音"
            desc="语音输入与朗读输出"
            value={prefs.voiceEnabled}
            onChange={(v) => setPrefs({ voiceEnabled: v })}
            palette={palette}
            primary={primary}
          />
        </Row>

        <Divider style={{ marginVertical: 18 }} />

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8 }}>本地模型文件（{localModels.length}）</Text>
        {localModels.length === 0 ? (
          <View style={[styles.emptyBox, { borderColor: palette.border }]}>
            <Ionicons name="archive-outline" size={22} color={palette.textFaint} />
            <Text style={{ color: palette.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' }}>
              还没有本地模型。可下载或从设备导入 .gguf / .bin 等模型文件。
            </Text>
          </View>
        ) : (
          localModels.map((m) => (
            <View key={m.id} style={[styles.modelRow, { borderColor: palette.border, backgroundColor: palette.surface }]}>
              <View style={[styles.modelIcon, { backgroundColor: alpha(primary, 0.1) }]}>
                <Ionicons name={KIND_LABEL[m.kind].icon} size={18} color={primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{m.name}</Text>
                <Text style={{ color: palette.textFaint, fontSize: 11.5, marginTop: 2 }}>
                  {KIND_LABEL[m.kind].label} · {formatBytes(m.size)} · {m.source === 'download' ? '已下载' : '已导入'}
                </Text>
              </View>
              <Pressable onPress={() => doRemove(m)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={palette.danger} />
              </Pressable>
            </View>
          ))
        )}

        <Divider style={{ marginVertical: 18 }} />

        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8 }}>添加模型</Text>
        <Text style={{ color: palette.textDim, fontSize: 12, marginBottom: 8 }}>模型类型</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {(Object.keys(KIND_LABEL) as LocalModel['kind'][]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.kindChip, { borderColor: kind === k ? primary : palette.border, backgroundColor: kind === k ? alpha(primary, 0.12) : palette.surfaceSunken }]}
            >
              <Text style={{ color: kind === k ? primary : palette.textDim, fontSize: 12.5, fontWeight: '600' }}>{KIND_LABEL[k].label}</Text>
            </Pressable>
          ))}
        </View>

        <Field
          label="下载地址"
          value={url}
          onChangeText={setUrl}
          placeholder="https://…/model.gguf"
          keyboardType="url"
          hint="需 http/https 直链；HuggingFace 请把链接里的 /blob/ 换成 /resolve/，页面地址不能直接下载。"
        />
        <Field label="保存名称（可选）" value={name} onChangeText={setName} placeholder="model.gguf" />

        {downloading ? (
          <View style={{ gap: 6, marginBottom: 10 }}>
            <ProgressBar percent={percent} height={6} />
            <Text style={{ color: palette.textDim, fontSize: 12 }}>正在下载 {percent}%</Text>
          </View>
        ) : null}

        <Row style={{ gap: 8, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Button title={downloading ? `下载中 ${percent}%` : '下载模型'} small onPress={doDownload} loading={downloading} icon="download-outline" />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="从设备导入" small variant="secondary" onPress={doImport} loading={importing} icon="folder-open-outline" />
          </View>
        </Row>
      </View>
    </SubScreen>
  );
}

function ToggleCard({
  icon,
  label,
  desc,
  value,
  onChange,
  palette,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  palette: { text: string; textDim: string; border: string; surface: string };
  primary: string;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      style={[styles.toggleCard, { borderColor: value ? alpha(primary, 0.5) : palette.border, backgroundColor: palette.surface }]}
    >
      <View style={[styles.modelIcon, { backgroundColor: alpha(primary, 0.1) }]}>
        <Ionicons name={icon} size={18} color={primary} />
      </View>
      <Text style={{ color: palette.text, fontSize: 14, fontWeight: '700', marginTop: 8 }}>{label}</Text>
      <Text style={{ color: palette.textDim, fontSize: 11.5, marginTop: 2, minHeight: 28 }}>{desc}</Text>
      <View style={[styles.switch, { backgroundColor: value ? primary : palette.border }]}>
        <View style={[styles.switchKnob, { transform: [{ translateX: value ? 18 : 2 }] }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  emptyBox: { borderWidth: 1, borderRadius: radius.lg, padding: 18, alignItems: 'center', borderStyle: 'dashed' },
  modelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: radius.lg, borderWidth: 1, marginBottom: 8 },
  modelIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleCard: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: 13 },
  switch: { width: 42, height: 24, borderRadius: 12, padding: 2, marginTop: 10 },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  kindChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1 },
});
