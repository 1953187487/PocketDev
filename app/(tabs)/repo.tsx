import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listGitIdentities, listProjects } from '@/api/client';
import type { GitIdentity, Project } from '@/api/types';
import { Button, Card, EmptyState, Row, Screen, SectionTitle, Spacer, StatusPill } from '@/components/ui';
import { useTheme } from '@/theme';
import { getObject, setObject } from '@/storage';

interface SelectedRepo {
  full_name: string;
  url: string;
  git_identity_id?: string;
}

export default function RepoScreen() {
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const [identities, setIdentities] = useState<GitIdentity[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<SelectedRepo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ids, projs] = await Promise.all([listGitIdentities(), listProjects()]);
      setIdentities(ids);
      setProjects(projs.projects);
      const saved = await getObject<SelectedRepo>('selected_repo');
      setSelected(saved);
    } catch (e) {
      setError((e as Error).message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectProject = async (p: Project) => {
    const repo: SelectedRepo = {
      full_name: p.full_name || p.name || p.repo_url || '',
      url: p.repo_url || '',
    };
    setSelected(repo);
    await setObject('selected_repo', repo);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        <Card>
          <Text style={[styles.title, { color: palette.text }]}>仓库配置</Text>
          <Text style={[styles.subtitle, { color: palette.textDim }]}>绑定 Git 身份，选择要开发的仓库</Text>
          <Spacer h={12} />
          <Button title="刷新" onPress={load} variant="ghost" loading={loading} />
        </Card>

        {error ? (
          <Card>
            <Row style={{ gap: 8 }}>
              <Ionicons name="alert-circle" size={18} color={palette.danger} />
              <Text style={{ color: palette.danger, flex: 1 }}>{error}</Text>
            </Row>
            <Spacer h={8} />
            <Text style={{ color: palette.textDim, fontSize: 13 }}>
              提示：请先在「设置 → 服务商 API」配置后端地址与 Key，然后返回刷新。
            </Text>
          </Card>
        ) : null}

        <SectionTitle>Git 身份</SectionTitle>
        {identities.length === 0 ? (
          <EmptyState
            icon="person-circle"
            title="尚未绑定 Git 身份"
            subtitle="请在设置页添加 GitHub / GitLab 等身份凭证"
          />
        ) : (
          identities.map((g) => (
            <Card key={g.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row style={{ gap: 8 }}>
                  <Ionicons name="logo-github" size={18} color={primary} />
                  <Text style={{ color: palette.text, fontWeight: '600' }}>
                    {g.username || g.email || g.platform}
                  </Text>
                </Row>
                <StatusPill text={g.platform || ''} color={primary} />
              </Row>
              {g.remark ? <Text style={[styles.dim, { color: palette.textDim }]}>{g.remark}</Text> : null}
            </Card>
          ))
        )}

        <SectionTitle>已配置仓库</SectionTitle>
        {projects.length === 0 ? (
          <EmptyState icon="folder-open" title="暂无项目" subtitle="在主页创建项目后自动出现在这里" />
        ) : (
          projects.map((p) => (
            <Card key={p.id}>
              <Pressable onPress={() => selectProject(p)}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.repoName, { color: palette.text }]}>{p.full_name || p.name}</Text>
                    <Text style={[styles.dim, { color: palette.textDim }]} numberOfLines={1}>
                      {p.repo_url || '未设置仓库地址'}
                    </Text>
                  </View>
                  {selected?.full_name === (p.full_name || p.name) ? (
                    <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color={palette.textDim} />
                  )}
                </Row>
              </Pressable>
            </Card>
          ))
        )}

        {selected ? (
          <Card style={{ borderColor: palette.success }}>
            <Text style={[styles.dim, { color: palette.textDim }]}>当前选中</Text>
            <Text style={[styles.repoName, { color: palette.text }]}>{selected.full_name}</Text>
            <Spacer h={8} />
            <Button title="开始开发" onPress={() => {}} />
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
  dim: { fontSize: 13, marginTop: 4 },
  repoName: { fontSize: 15, fontWeight: '600' },
});
