// Ürün dokümanı v2.0 §13 (Veri Modeli) ve §14 (Supabase şeması) ile birebir eşleşir.

export type TaskStatus =
  | 'pending'
  | 'started'
  | 'in_progress'
  | 'in_review'
  | 'handed_off'
  | 'completed'
  | 'failed'
  | 'postponed'
  | 'cancelled';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type ProgressMode = 'manual' | 'checklist' | 'subtask';

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'viewer';

export type NoteType =
  | 'personal'
  | 'team'
  | 'handoff_note'
  | 'manager_note'
  | 'daily_note'
  | 'blocker_note';

export type HandoffAcceptedStatus = 'pending' | 'accepted' | 'rejected';

export type InviteRole = Exclude<WorkspaceRole, 'owner'>;
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  type: 'personal' | 'team';
  createdAt: string;
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  lastActiveAt?: string;
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string;
  role: InviteRole;
  invitedBy: string;
  status: InviteStatus;
  createdAt: string;
  resolvedAt?: string;
}

export const INVITE_ROLE_LABELS: Record<InviteRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const INVITE_STATUS_LABELS: Record<InviteStatus, string> = {
  pending: 'Bekliyor',
  accepted: 'Kabul edildi',
  declined: 'Reddedildi',
  cancelled: 'İptal edildi',
};

export interface ChecklistItem {
  id: string;
  taskId: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface Task {
  id: string;
  workspaceId: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  category?: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  progressMode: ProgressMode;
  assignedTo?: string;
  assigneeIds: string[];
  createdBy: string;
  startDate?: string;
  dueDate?: string;
  tags: string[];
  checklist: ChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskNote {
  id: string;
  taskId: string;
  userId: string;
  type: NoteType;
  content: string;
  createdAt: string;
}

export interface TaskHandoff {
  id: string;
  taskId: string;
  fromUserId: string;
  toUserId: string;
  currentStatus: TaskStatus;
  doneSoFar: string;
  remainingWork: string;
  cautionNotes?: string;
  newPriority?: TaskPriority;
  newDueDate?: string;
  acceptedStatus: HandoffAcceptedStatus;
  createdAt: string;
  resolvedAt?: string;
}

export interface DailySave {
  id: string;
  userId: string;
  workspaceId: string;
  date: string;
  completedTasks: number;
  failedTasks: number;
  postponedTasks: number;
  successRate: number;
  dailyNote?: string;
  createdAt: string;
}

export interface MotivationContent {
  id: string;
  imageUrl: string;
  quote: string;
  category: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  userOneId: string;
  userTwoId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt?: string;
  createdAt: string;
}

export type AttachmentKind = 'image' | 'file' | 'voice';

export interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedBy: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  sizeBytes?: number;
  durationSeconds?: number;
  createdAt: string;
}

export type NotificationType =
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'task_note_added'
  | 'task_handoff_received'
  | 'daily_save_reminder'
  | 'checklist_incomplete'
  | 'weekly_report_ready'
  | 'workspace_invite_received'
  | 'message_received';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  taskId?: string;
  conversationId?: string;
  message?: string;
  read: boolean;
  createdAt: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: 'Beklemede',
  started: 'Başlandı',
  in_progress: 'Devam Ediyor',
  in_review: 'İncelemede',
  handed_off: 'Devredildi',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  postponed: 'Ertelendi',
  cancelled: 'İptal Edildi',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Yüksek',
  critical: 'Kritik',
};

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  personal: 'Kişisel not',
  team: 'Ekip notu',
  handoff_note: 'Devir notu',
  manager_note: 'Yönetici notu',
  daily_note: 'Gün sonu notu',
  blocker_note: 'Hata / engel notu',
};
