export type TaskStatus = 'pending' | 'processing' | 'error' | 'finished';
export type TaskType = 'develop' | 'design' | 'review';

export interface ApiEnvelope<T = unknown> {
  code: number;
  message?: string;
  data?: T;
}

export interface ModelBrief {
  id?: string;
  model?: string;
  remark?: string;
  provider?: string;
}

export interface Project {
  id?: string;
  name?: string;
  description?: string;
  full_name?: string;
  repo_url?: string;
  platform?: string;
  auto_review_enabled?: boolean;
  created_at?: number;
  updated_at?: number;
  tasks?: ProjectTask[];
}

export interface ProjectTask {
  id: string;
  title?: string;
  content?: string;
  summary?: string;
  status?: TaskStatus;
  type?: TaskType;
  sub_type?: string;
  cli_name?: string;
  repo_url?: string;
  repo_filename?: string;
  branch?: string;
  full_name?: string;
  model?: ModelBrief;
  stats?: TaskStats;
  virtualmachine?: { id?: string; conditions?: Condition[] };
  created_at?: number;
  completed_at?: number;
}

export interface TaskStats {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  llm_requests?: number;
}

export type ConditionType =
  | 'Scheduled' | 'ImagePulled' | 'ProjectCloned' | 'ImageBuilt'
  | 'ContainerCreated' | 'ContainerStarted' | 'Ready' | 'Failed';

export interface Condition {
  type?: ConditionType;
  status?: number;
  reason?: string;
  message?: string;
  progress?: number;
  last_transition_time?: number;
}

export interface UserStatus {
  id?: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  avatar_url?: string;
  role?: string;
}

export interface Wallet {
  balance?: number;
  daily_token_balance?: number;
  daily_token_limit?: number;
}

export interface Subscription {
  plan?: string;
  expires_at?: string;
  auto_renew?: boolean;
  source?: string;
}

export type OwnerType = 'private' | 'public' | 'team';

export type ModelInterfaceType = 'openai_chat' | 'openai_responses' | 'anthropic';

export interface Model {
  id?: string;
  model?: string;
  remark?: string;
  provider?: string;
  is_default?: boolean;
  is_free?: boolean;
  is_hidden?: boolean;
  access_level?: string;
  weight?: number;
  owner?: { id?: string; name?: string; type?: OwnerType };
  base_url?: string;
  api_key?: string;
  interface_type?: ModelInterfaceType;
  context_limit?: number;
  output_limit?: number;
  thinking_enabled?: boolean;
  support_image?: boolean;
}

export interface CreateModelReq {
  provider: string;
  model: string;
  base_url: string;
  api_key: string;
  interface_type: ModelInterfaceType;
  remark?: string;
  context_limit?: number;
  output_limit?: number;
  thinking_enabled?: boolean;
  support_image?: boolean;
  is_default?: boolean;
}

export interface CheckModelResp {
  success?: boolean;
  error?: string;
}

export interface ProviderModelItem {
  model?: string;
}

export type GitPlatform = 'github' | 'gitlab' | 'gitea' | 'gitee' | 'codeup' | 'cnb' | 'atomgit' | 'internal';

export interface AuthRepository {
  url?: string;
  full_name?: string;
  description?: string;
}

export interface GitIdentity {
  id?: string;
  platform?: GitPlatform;
  base_url?: string;
  username?: string;
  email?: string;
  access_token?: string;
  remark?: string;
  organization_id?: string;
  is_installation_app?: boolean;
  created_at?: string;
  authorized_repositories?: AuthRepository[];
}

export interface AddGitIdentityReq {
  platform: GitPlatform;
  base_url: string;
  access_token: string;
  username: string;
  email: string;
  remark?: string;
  organization_id?: string;
}

export interface CreateProjectReq {
  name?: string;
  description?: string;
  platform?: GitPlatform;
  git_identity_id?: string;
  repo_url?: string;
}
