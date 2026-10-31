import { Button, EmptyState, Field, IconButton, Pill, Row, Screen, SectionLabel, Spacer, Surface } from '@/ui';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, radius, space, useTheme } from '@/theme';
import { useAppStore, type Workspace } from '@/store/app';
import { createRepo, GIT_HOSTS, listRepos, type Repo } from '@/api/git';

export default function RepoScreen() {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { git, gitReady, workspaces, addWorkspace, removeWorkspace } = useAppStore();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const hasToken = !!git.token.trim();

  const load = useCallback(async () => {
    if (!hasToken) {
      setRepos([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const list = await listRepos(git);
      setRepos(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [git, hasToken]);

  useEffect(() => {
    if (gitReady) load();
  }, [gitReady, load]);

  const doCreate = useCallback(async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert('请输入仓库名');
      return;
    }
    setCreating(true);
    try {
      const repo = await createRepo(git, { name: n, description: desc.trim(), private: isPrivate, autoInit: true });
      setCreateOpen(false);
      setName('');
      setDesc('');
      setIsPrivate(false);
      addWorkspace({ name: repo.name, repoFullName: repo.fullName, repoUrl: repo.url, branch: repo.defaultBranch });
      await load();
      Alert.alert('创建成功', `${repo.fullName} 已创建，并已添加为工作区`);
    } catch (e) {
      Alert.alert('创建失败', (e as Error).message);
    } finally {
      setCreating(false);
    }
  }, [name, desc, isPrivate, git, addWorkspace, load]);

  return (
    <Screen edges={false}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: palette.text }]}>仓库</Text>
          <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 2 }}>
            {hasToken ? `已连接 ${GIT_HOSTS[git.platform].label}${git.username ? ` · ${git.username}` : ''}` : '配置访问令牌即可直接管理仓库'}
          </Text>
        </View>
        <IconButton
          icon="add"
          tone="primary"
          onPress={() => setCreateOpen(true)}
          accessibilityLabel="创建仓库"
        />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={primary} />}
      >
        {!hasToken ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <Surface>
              <Row style={{ gap: 10 }}>
                <Ionicons name="key-outline" size={20} color={primary} />
                <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700', flex: 1 }}>需要访问令牌</Text>
              </Row>
              <Spacer h={8} />
              <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 19 }}>
                在「设置 → 访问令牌」中填入 GitHub / GitLab / Gitee 的 Personal Access Token，配置完成后即可在此列出仓库、创建仓库并加入工作区。
              </Text>
              <Spacer h={14} />
              <Button title="前往配置令牌" icon="settings-outline" onPress={() => router.push('/settings')} />
            </Surface>
          </View>
        ) : null}

        {error ? (
          <View style={{ paddingHorizontal: space.lg }}>
            <Surface>
              <Row style={{ gap: 8 }}>
                <Ionicons name="alert-circle" size={18} color={palette.danger} />
                <Text style={{ color: palette.danger, flex: 1, fontSize: 13 }}>{error}</Text>
              </Row>
            </Surface>
          </View>
        ) : null}

        <SectionLabel>工作区（{workspaces.length}）</SectionLabel>
        <View style={{ paddingHorizontal: space.lg }}>
          {workspaces.length === 0 ? (
            <Surface tone="sunken">
              <Text style={{ color: palette.textDim, fontSize: 13 }}>
                还没有工作区。创建或选择一个仓库即可将其加入工作区，对话时会带上仓库上下文。
              </Text>
            </Surface>
          ) : (
            workspaces.map((w) => (
              <Surface key={w.id} style={{ marginBottom: space.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Row style={{ gap: 12, flex: 1 }}>
                    <View style={[styles.repoIcon, { backgroundColor: alpha(primary, 0.12) }]}>
                      <Ionicons name="folder-open" size={18} color={primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                        {w.name}
                      </Text>
                      <Text style={{ color: palette.textFaint, fontSize: 12 }} numberOfLines={1}>
                        {w.repoFullName || '本地工作区'}
                        {w.branch ? ` · ${w.branch}` : ''}
                      </Text>
                    </View>
                  </Row>
                  <Pressable onPress={() => removeWorkspace(w.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={palette.textFaint} />
                  </Pressable>
                </Row>
                {w.repoUrl ? (
                  <>
                    <Spacer h={10} />
                    <Pressable onPress={() => Linking.openURL(w.repoUrl!)}>
                      <Text style={{ color: primary, fontSize: 12.5, fontWeight: '600' }}>在浏览器打开 →</Text>
                    </Pressable>
                  </>
                ) : null}
              </Surface>
            ))
          )}
        </View>

        <SectionLabel>我的仓库（{repos.length}）</SectionLabel>
        <View style={{ paddingHorizontal: space.lg }}>
          {hasToken && repos.length === 0 && !loading ? (
            <EmptyState icon="folder-open-outline" title="暂无仓库" subtitle="点击右上角 + 创建第一个仓库" />
          ) : null}
          {!hasToken ? (
            <EmptyState icon="lock-closed-outline" title="未配置访问令牌" subtitle="配置后即可查看和管理你的仓库" />
          ) : null}
          {repos.map((r) => (
            <Surface key={r.fullName} style={{ marginBottom: space.md }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Row style={{ gap: 6 }}>
                    <Text style={{ color: palette.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
                      {r.fullName}
                    </Text>
                    {r.private ? <Pill text="私有" color={palette.warning} icon="lock-closed" /> : null}
                  </Row>
                  {r.description ? (
                    <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 4 }} numberOfLines={2}>
                      {r.description}
                    </Text>
                  ) : null}
                  <Row style={{ gap: 10, marginTop: 8 }}>
                    {r.language ? <Text style={{ color: palette.textFaint, fontSize: 11.5 }}>{r.language}</Text> : null}
                    {r.defaultBranch ? <Text style={{ color: palette.textFaint, fontSize: 11.5 }}>默认分支 {r.defaultBranch}</Text> : null}
                    {typeof r.stars === 'number' ? (
                      <Text style={{ color: palette.textFaint, fontSize: 11.5 }}>★ {r.stars}</Text>
                    ) : null}
                  </Row>
                </View>
              </Row>
              <Spacer h={12} />
              <Row style={{ gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="加入工作区"
                    small
                    icon="folder-open-outline"
                    onPress={() => {
                      addWorkspace({ name: r.name, repoFullName: r.fullName, repoUrl: r.url, branch: r.defaultBranch });
                      Alert.alert('已添加', `${r.fullName} 已加入工作区`);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="打开"
                    small
                    variant="secondary"
                    icon="open-outline"
                    onPress={() => Linking.openURL(r.url)}
                  />
                </View>
              </Row>
            </Surface>
          ))}
        </View>
      </ScrollView>

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Pressable onPress={() => setCreateOpen(false)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18, backgroundColor: palette.mode === 'dark' ? '#121828' : '#FFFFFF', borderColor: palette.border }]}>
            <View style={styles.handle} />
            <Text style={[styles.sheetTitle, { color: palette.text }]}>创建仓库</Text>
            <Text style={{ color: palette.textDim, fontSize: 12.5, marginBottom: 14 }}>
              将在 {GIT_HOSTS[git.platform].label} 上以 {git.username || '当前令牌账号'} 的身份创建
            </Text>
            <Field label="仓库名称" value={name} onChangeText={setName} placeholder="my-project" />
            <Field label="仓库描述（可选）" value={desc} onChangeText={setDesc} placeholder="一句话描述这个仓库" autoCapitalize="sentences" />
            <Pressable
              onPress={() => setIsPrivate((v) => !v)}
              style={[styles.switchRow, { borderColor: palette.border, backgroundColor: palette.surfaceSunken }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>私有仓库</Text>
                <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 2 }}>公开仓库任何人都可查看</Text>
              </View>
              <View style={[styles.switch, { backgroundColor: isPrivate ? primary : palette.borderStrong }]}>
                <View style={[styles.knob, { transform: [{ translateX: isPrivate ? 18 : 0 }] }]} />
              </View>
            </Pressable>
            <Spacer h={16} />
            <Button title="创建仓库" onPress={doCreate} loading={creating} icon="cloud-upload-outline" />
            <Spacer h={8} />
            <Button title="取消" variant="ghost" onPress={() => setCreateOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingBottom: space.md },
  title: { fontSize: 26, fontWeight: '800' },
  repoIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: space.lg, paddingTop: 10 },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#00000033', alignSelf: 'center', marginBottom: 14 },
  sheetTitle: { fontSize: 19, fontWeight: '800', marginBottom: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: radius.lg, borderWidth: 1, marginBottom: space.md },
  switch: { width: 42, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
});
