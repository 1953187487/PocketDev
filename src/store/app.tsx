import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getObject, setObject } from '@/storage';

export type InterfaceType = 'openai_chat' | 'anthropic';

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  interfaceType: InterfaceType;
  temperature: number;
}

export interface Workspace {
  id: string;
  name: string;
  /** 工作区来源：远端仓库或手机本地目录。 */
  kind?: 'git' | 'local';
  /** 本地目录工作区的 URI 路径。 */
  root?: string;
  repoFullName?: string;
  repoUrl?: string;
  branch?: string;
}

export type GitPlatform = 'github' | 'gitlab' | 'gitee' | 'gitea';

export interface GitConfig {
  platform: GitPlatform;
  baseUrl: string;
  token: string;
  username?: string;
  avatar?: string;
}

export const DEFAULT_PROVIDER: ProviderConfig = {
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: '',
  model: 'deepseek-chat',
  interfaceType: 'openai_chat',
  temperature: 0.6,
};

export const DEFAULT_GIT: GitConfig = {
  platform: 'github',
  baseUrl: 'https://github.com',
  token: '',
};

export type AppLanguage = 'zh' | 'en';

export interface LocalModel {
  id: string;
  name: string;
  kind: 'llm' | 'translation' | 'voice';
  source: 'download' | 'import';
  uri: string;
  size: number;
  createdAt: number;
}

export interface AppPrefs {
  language: AppLanguage;
  onboarded: boolean;
  agreementsAccepted: boolean;
  privacyAccepted: boolean;
  autoUpdate: boolean;
  voiceEnabled: boolean;
  translateEnabled: boolean;
  /** 计划模式：对话前先出执行计划，经确认后执行。 */
  planMode: boolean;
}

export const DEFAULT_PREFS: AppPrefs = {
  language: 'zh',
  onboarded: false,
  agreementsAccepted: false,
  privacyAccepted: false,
  autoUpdate: true,
  voiceEnabled: true,
  translateEnabled: true,
  planMode: false,
};

const PROVIDER_KEY = 'cfg_provider';
const GIT_KEY = 'cfg_git';
const WORKSPACES_KEY = 'workspaces';
const ACTIVE_WS_KEY = 'active_workspace';
const PREFS_KEY = 'app_prefs';
const MODELS_KEY = 'local_models';

interface AppStore {
  provider: ProviderConfig;
  setProvider: (p: ProviderConfig) => void;
  providerReady: boolean;

  git: GitConfig;
  setGit: (g: GitConfig) => void;
  gitReady: boolean;

  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  addWorkspace: (w: Omit<Workspace, 'id'>) => Workspace;
  updateWorkspace: (id: string, patch: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;

  tabBarVisible: boolean;
  setTabBarVisible: (v: boolean) => void;

  prefs: AppPrefs;
  setPrefs: (p: Partial<AppPrefs>) => void;
  localModels: LocalModel[];
  addLocalModel: (m: Omit<LocalModel, 'id' | 'createdAt'>) => void;
  removeLocalModel: (id: string) => void;
}

const Ctx = createContext<AppStore | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<ProviderConfig>(DEFAULT_PROVIDER);
  const [git, setGitState] = useState<GitConfig>(DEFAULT_GIT);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveId] = useState<string | null>(null);
  const [providerReady, setProviderReady] = useState(false);
  const [gitReady, setGitReady] = useState(false);
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const [prefs, setPrefsState] = useState<AppPrefs>(DEFAULT_PREFS);
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    (async () => {
      const [p, g, ws, active, pre, mods] = await Promise.all([
        getObject<Partial<ProviderConfig>>(PROVIDER_KEY),
        getObject<Partial<GitConfig>>(GIT_KEY),
        getObject<Workspace[]>(WORKSPACES_KEY),
        getObject<string>(ACTIVE_WS_KEY),
        getObject<Partial<AppPrefs>>(PREFS_KEY),
        getObject<LocalModel[]>(MODELS_KEY),
      ]);
      if (p) setProviderState({ ...DEFAULT_PROVIDER, ...p });
      if (g) setGitState({ ...DEFAULT_GIT, ...g });
      if (Array.isArray(ws)) setWorkspaces(ws);
      if (typeof active === 'string') setActiveId(active);
      if (pre) setPrefsState({ ...DEFAULT_PREFS, ...pre });
      if (Array.isArray(mods)) setLocalModels(mods);
      setProviderReady(true);
      setGitReady(true);
      hydrated.current = true;
    })();
  }, []);

  const setProvider = useCallback((p: ProviderConfig) => {
    setProviderState(p);
    void setObject(PROVIDER_KEY, p);
  }, []);

  const setGit = useCallback((g: GitConfig) => {
    setGitState(g);
    void setObject(GIT_KEY, g);
  }, []);

  const persistWorkspaces = useCallback((next: Workspace[]) => {
    setWorkspaces(next);
    void setObject(WORKSPACES_KEY, next);
  }, []);

  const setActiveWorkspaceId = useCallback((id: string) => {
    setActiveId(id);
    void setObject(ACTIVE_WS_KEY, id);
  }, []);

  const addWorkspace = useCallback(
    (w: Omit<Workspace, 'id'>) => {
      const created: Workspace = { id: uid(), ...w };
      persistWorkspaces([created, ...workspaces]);
      setActiveId(created.id);
      void setObject(ACTIVE_WS_KEY, created.id);
      return created;
    },
    [workspaces, persistWorkspaces],
  );

  const updateWorkspace = useCallback(
    (id: string, patch: Partial<Workspace>) => {
      persistWorkspaces(workspaces.map((w) => (w.id === id ? { ...w, ...patch } : w)));
    },
    [workspaces, persistWorkspaces],
  );

  const removeWorkspace = useCallback(
    (id: string) => {
      const next = workspaces.filter((w) => w.id !== id);
      persistWorkspaces(next);
      if (activeWorkspaceId === id) {
        const fallback = next[0]?.id ?? null;
        setActiveId(fallback);
        void setObject(ACTIVE_WS_KEY, fallback);
      }
    },
    [workspaces, activeWorkspaceId, persistWorkspaces],
  );

  const setPrefs = useCallback((patch: Partial<AppPrefs>) => {
    setPrefsState((prev) => {
      const next = { ...prev, ...patch };
      void setObject(PREFS_KEY, next);
      return next;
    });
  }, []);

  const addLocalModel = useCallback(
    (m: Omit<LocalModel, 'id' | 'createdAt'>) => {
      const created: LocalModel = { id: uid(), createdAt: Date.now(), ...m };
      setLocalModels((prev) => {
        const next = [created, ...prev];
        void setObject(MODELS_KEY, next);
        return next;
      });
      return created;
    },
    [],
  );

  const removeLocalModel = useCallback((id: string) => {
    setLocalModels((prev) => {
      const next = prev.filter((m) => m.id !== id);
      void setObject(MODELS_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<AppStore>(
    () => ({
      provider,
      setProvider,
      providerReady,
      git,
      setGit,
      gitReady,
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      addWorkspace,
      updateWorkspace,
      removeWorkspace,
      tabBarVisible,
      setTabBarVisible,
      prefs,
      setPrefs,
      localModels,
      addLocalModel,
      removeLocalModel,
    }),
    [
      provider,
      setProvider,
      providerReady,
      git,
      setGit,
      gitReady,
      workspaces,
      activeWorkspaceId,
      setActiveWorkspaceId,
      addWorkspace,
      updateWorkspace,
      removeWorkspace,
      tabBarVisible,
      setTabBarVisible,
      prefs,
      setPrefs,
      localModels,
      addLocalModel,
      removeLocalModel,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}

export function useActiveWorkspace(): Workspace | null {
  const { workspaces, activeWorkspaceId } = useAppStore();
  return workspaces.find((w) => w.id === activeWorkspaceId) ?? null;
}
