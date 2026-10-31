import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListRow, space, type, useTheme, AuroraBackdrop } from '@/ui';
import { useAppStore } from '@/store/app';
import { loadApplets } from '@/api/applets';

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { palette } = theme;
  const { workspaces } = useAppStore();
  const [appletCount, setAppletCount] = useState(0);

  useEffect(() => {
    (async () => {
      const list = await loadApplets();
      setAppletCount(list.filter((a) => a.enabled).length);
    })();
  }, []);

  const localCount = workspaces.filter((w) => w.kind === 'local').length;

  return (
    <View style={{ flex: 1 }}>
      <AuroraBackdrop />
      <View style={{ paddingTop: insets.top + 14, paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <Text style={{ color: palette.text, ...type.title }}>更多功能</Text>
        <Text style={{ color: palette.textFaint, ...type.caption, marginTop: 2 }}>
          扩展能力与本地化工作区
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: insets.bottom + 96, gap: space.md }}>
        <ListRow
          icon="construct-outline"
          title="功能应用"
          subtitle="开发可被 AI 调用的轻量功能"
          value={appletCount ? `${appletCount} 个可用` : '未创建'}
          onPress={() => router.push('/applets')}
        />
        <ListRow
          icon="folder-open-outline"
          title="本地目录工作区"
          subtitle="选择手机本地目录作为工作区"
          value={localCount ? `${localCount} 个` : '未添加'}
          onPress={() => router.push('/more/local')}
        />
        <ListRow
          icon="phone-portrait-outline"
          title="手机自动化（小龙虾）"
          subtitle="Shizuku / Dhizuku 助手式设备操作"
          onPress={() => router.push('/more/automation')}
        />
        <ListRow
          icon="cube-outline"
          title="本地模型"
          subtitle="下载或导入本地推理模型文件"
          onPress={() => router.push('/settings/models')}
        />
      </ScrollView>
    </View>
  );
}
