import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { space, useTheme } from '@/ui';
import { Button, Pill, Row, SubScreen } from '@/components/ui';
import { ProgressBar, UpdateTransition, Collapsible } from '@/ui';
import { useAppStore } from '@/store/app';
import { checkForUpdate, downloadApk, installApk, type ReleaseInfo } from '@/api/updates';
import { APP_VERSION, APP_REPO_URL } from '@/config';

type DlPhase = 'idle' | 'downloading' | 'install' | 'done' | 'error';

export default function UpdateScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { palette, primary } = theme;
  const { prefs, setPrefs } = useAppStore();

  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState('');
  const [has, setHas] = useState(false);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [dl, setDl] = useState<DlPhase>('idle');
  const [percent, setPercent] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    setMsg('');
    const { hasUpdate, release: rel } = await checkForUpdate();
    setHas(hasUpdate);
    setRelease(rel);
    setMsg(hasUpdate ? `发现新版本 ${rel?.tag}` : '当前已是最新版本');
    setChecking(false);
  }, []);

  const download = useCallback(async () => {
    if (!release?.download_url) return;
    setDl('downloading');
    setPercent(0);
    setMsg('');
    try {
      const u = await downloadApk(release.download_url, setPercent);
      setUri(u);
      setPercent(100);
      setDl('install');
      await installApk(u);
      setDl('done');
    } catch (e) {
      setMsg((e as Error).message || '下载失败');
      setDl('error');
    }
  }, [release]);

  const downloading = dl === 'downloading';
  const busy = downloading || dl === 'install';

  return (
    <SubScreen title="检查更新" onBack={() => router.back()}>
      <View style={{ paddingHorizontal: space.lg }}>
        <UpdateTransition visible={busy} progress={dl === 'install' ? 100 : percent} />
        <Text style={{ color: palette.textDim, fontSize: 13, lineHeight: 20, marginBottom: 16 }}>
          应用会在每次进入时自动检查新版本；若当时断网，联网恢复后会在几秒内自动重试并下载更新。
        </Text>

        <Pill text={`当前版本 v${APP_VERSION}`} icon="information-circle" />
        <Text style={{ color: palette.textDim, fontSize: 12.5, marginTop: 12, marginBottom: 8 }}>自动更新</Text>
        <Row style={{ gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title="自动更新：开" small variant={prefs.autoUpdate ? 'primary' : 'secondary'} onPress={() => setPrefs({ autoUpdate: true })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="自动更新：关" small variant={prefs.autoUpdate ? 'secondary' : 'primary'} onPress={() => setPrefs({ autoUpdate: false })} />
          </View>
        </Row>
        <Text style={{ color: palette.textFaint, fontSize: 12, marginTop: 8 }}>
          开启后：检测到新版本将自动下载安装包，断网恢复后数秒内自动补下。
        </Text>

        <View style={{ marginTop: 16 }}>
          <Button title="立即检查更新" onPress={check} loading={checking} icon="refresh" />
        </View>

        {msg ? <Text style={{ color: primary, fontSize: 13, marginTop: 14 }}>{msg}</Text> : null}

        {release ? (
          <View style={{ marginTop: 8, gap: 10 }}>
            <Pill text={`最新版本 ${release.tag}`} color={palette.success} icon="sparkles" />

            {release.notes ? (
              <Collapsible
                title="更新公告"
                body={release.notes}
                expanded={notesOpen}
                onToggle={() => setNotesOpen((v) => !v)}
              />
            ) : null}

            {busy ? (
              <View style={{ gap: 6 }}>
                <ProgressBar percent={dl === 'install' ? 100 : percent} indeterminate={dl === 'install'} height={8} />
                <Text style={{ color: palette.textDim, fontSize: 12.5 }}>
                  {dl === 'install' ? '正在唤起系统安装器…' : `已下载 ${percent}%`}
                </Text>
              </View>
            ) : null}

            {dl === 'done' ? (
              <Pill text="安装器已打开，请在系统界面完成安装" color={palette.success} icon="checkmark-circle" />
            ) : null}

            <Button
              title={dl === 'done' ? '重新打开安装包' : '下载并安装'}
              variant="primary"
              loading={busy}
              disabled={!has && dl !== 'done'}
              onPress={() => (dl === 'done' && uri ? installApk(uri) : download())}
            />
            <Button title="前往发布页" variant="ghost" onPress={() => Linking.openURL(release.url || APP_REPO_URL)} />
          </View>
        ) : null}
      </View>
    </SubScreen>
  );
}
