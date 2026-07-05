import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { sendInviteEmail } from '../lib/inviteEmail';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { useAppTheme } from '../theme/ThemeProvider';
import {
  AppNotification,
  AttachmentKind,
  ChatMessage,
  ChecklistItem,
  Conversation,
  DailySave,
  InviteRole,
  NoteType,
  Task,
  TaskAttachment,
  TaskHandoff,
  TaskNote,
  TaskPriority,
  TaskStatus,
  User,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
} from '../types';

// Bu store tüm ekranların ihtiyaç duyduğu veriyi ve aksiyonları tek yerden
// Supabase üzerinden sağlar. Oturum açılınca: profil + kişisel workspace
// yoksa oluşturulur (bootstrap), kullanıcının üyesi olduğu TÜM workspace'ler
// çekilir, aktif workspace'e ait veri yüklenir. Ekranlar useAppStore()
// üzerinden okur — arayüz mock döneminden beri aynı.

type Member = WorkspaceMember & { user: User };

const ACTIVE_WORKSPACE_KEY = 'rutin.activeWorkspaceId';

interface AppStoreValue {
  loading: boolean;
  currentUser: User;
  users: User[];
  workspace: Workspace;
  workspaces: Workspace[];
  members: Member[];
  tasks: Task[];
  notes: TaskNote[];
  handoffs: TaskHandoff[];
  dailySaves: DailySave[];
  myInvites: WorkspaceInvite[];
  sentInvites: WorkspaceInvite[];
  myPendingHandoffs: TaskHandoff[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  conversations: Conversation[];
  messages: ChatMessage[];
  unreadMessageCount: number;
  attachments: TaskAttachment[];

  getTask: (taskId: string) => Task | undefined;
  getUser: (userId: string) => User | undefined;
  getTaskNotes: (taskId: string) => TaskNote[];
  getTaskHandoffs: (taskId: string) => TaskHandoff[];
  getSubtasks: (taskId: string) => Task[];
  getConversationMessages: (conversationId: string) => ChatMessage[];
  getOtherParticipant: (conversation: Conversation) => User | undefined;
  unreadCountForConversation: (conversationId: string) => number;
  getTaskAttachments: (taskId: string) => TaskAttachment[];

  createTask: (input: Partial<Task> & { title: string }) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  addSubtask: (parentTaskId: string, input: { title: string; assignedTo?: string }) => Promise<Task>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  toggleChecklistItem: (taskId: string, checklistItemId: string) => void;
  addChecklistItem: (taskId: string, text: string) => void;
  addNote: (taskId: string, content: string, type?: NoteType) => void;
  handoffTask: (input: {
    taskId: string;
    toUserId: string;
    doneSoFar: string;
    remainingWork: string;
    cautionNotes?: string;
    newPriority?: TaskPriority;
    newDueDate?: string;
  }) => Promise<void>;
  acceptHandoff: (handoffId: string) => Promise<void>;
  rejectHandoff: (handoffId: string) => Promise<void>;
  saveDay: (dailyNote: string) => Promise<DailySave>;
  todaySave: () => DailySave | undefined;

  switchWorkspace: (workspaceId: string) => Promise<void>;
  inviteMember: (email: string, role: InviteRole) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  acceptInvite: (inviteId: string) => Promise<void>;
  declineInvite: (inviteId: string) => Promise<void>;

  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;

  getOrCreateConversation: (otherUserId: string) => Promise<Conversation>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  markConversationRead: (conversationId: string) => void;

  uploadAttachment: (
    taskId: string,
    file: { uri: string; name: string; mimeType: string; kind: AttachmentKind; durationSeconds?: number }
  ) => Promise<TaskAttachment>;
  getAttachmentUrl: (storagePath: string) => Promise<string>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
}

const AppStoreContext = createContext<AppStoreValue | undefined>(undefined);

const EMPTY_USER: User = { id: '', name: '', email: '', createdAt: '' };
const EMPTY_WORKSPACE: Workspace = { id: '', name: '', ownerId: '', type: 'personal', createdAt: '' };

function computeProgress(task: Task): number {
  if (task.progressMode !== 'checklist' || task.checklist.length === 0) {
    return task.progress;
  }
  const done = task.checklist.filter((c) => c.completed).length;
  return Math.round((done / task.checklist.length) * 100);
}

function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

function mapWorkspace(row: any): Workspace {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    type: row.type,
    createdAt: row.created_at,
  };
}

function mapMember(row: any): Member {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    user: mapUser(row.user),
  };
}

function mapInvite(row: any): WorkspaceInvite {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

function mapChecklistItem(row: any): ChecklistItem {
  return {
    id: row.id,
    taskId: row.task_id,
    text: row.text,
    completed: row.completed,
    order: row.order,
  };
}

function mapTask(row: any): Task {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    parentTaskId: row.parent_task_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    status: row.status,
    priority: row.priority,
    progress: row.progress,
    progressMode: row.progress_mode,
    assignedTo: row.assigned_to ?? undefined,
    createdBy: row.created_by,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
    checklist: ((row.checklist ?? []) as any[]).map(mapChecklistItem).sort((a, b) => a.order - b.order),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapNote(row: any): TaskNote {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

function mapHandoff(row: any): TaskHandoff {
  return {
    id: row.id,
    taskId: row.task_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    currentStatus: row.current_status,
    doneSoFar: row.done_so_far,
    remainingWork: row.remaining_work,
    cautionNotes: row.caution_notes ?? undefined,
    newPriority: row.new_priority ?? undefined,
    newDueDate: row.new_due_date ?? undefined,
    acceptedStatus: row.accepted_status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined,
  };
}

function mapSave(row: any): DailySave {
  return {
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    date: row.date,
    completedTasks: row.completed_tasks,
    failedTasks: row.failed_tasks,
    postponedTasks: row.postponed_tasks,
    successRate: Number(row.success_rate),
    dailyNote: row.daily_note ?? undefined,
    createdAt: row.created_at,
  };
}

function mapNotification(row: any): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    taskId: row.task_id ?? undefined,
    conversationId: row.conversation_id ?? undefined,
    message: row.message ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

function mapConversation(row: any): Conversation {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userOneId: row.user_one_id,
    userTwoId: row.user_two_id,
    createdAt: row.created_at,
  };
}

function mapAttachment(row: any): TaskAttachment {
  return {
    id: row.id,
    taskId: row.task_id,
    uploadedBy: row.uploaded_by,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    kind: row.kind,
    sizeBytes: row.size_bytes ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    createdAt: row.created_at,
  };
}

function mapMessage(row: any): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    readAt: row.read_at ?? undefined,
    createdAt: row.created_at,
  };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [handoffs, setHandoffs] = useState<TaskHandoff[]>([]);
  const [dailySaves, setDailySaves] = useState<DailySave[]>([]);
  const [myInvites, setMyInvites] = useState<WorkspaceInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<WorkspaceInvite[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  const workspace = workspaces.find((w) => w.id === activeWorkspaceId) ?? EMPTY_WORKSPACE;

  // Aktif workspace'e ait tüm veriyi çeker (üye/görev/not/devir/save/davet).
  // Hem ilk yüklemede hem workspace değiştirildiğinde çağrılır.
  const loadWorkspaceData = useCallback(async (workspaceId: string, userId: string) => {
    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('*, user:users(*)')
      .eq('workspace_id', workspaceId);
    setMembers((memberRows ?? []).map(mapMember));

    const { data: taskRows } = await supabase
      .from('tasks')
      .select('*, checklist:task_checklists(*)')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    const mappedTasks = (taskRows ?? []).map(mapTask);
    setTasks(mappedTasks);

    const taskIds = mappedTasks.map((t) => t.id);
    if (taskIds.length > 0) {
      const { data: noteRows } = await supabase.from('task_notes').select('*').in('task_id', taskIds);
      setNotes((noteRows ?? []).map(mapNote));
      const { data: handoffRows } = await supabase.from('task_handoffs').select('*').in('task_id', taskIds);
      setHandoffs((handoffRows ?? []).map(mapHandoff));
      const { data: attachmentRows } = await supabase.from('task_attachments').select('*').in('task_id', taskIds);
      setAttachments((attachmentRows ?? []).map(mapAttachment));
    } else {
      setNotes([]);
      setHandoffs([]);
      setAttachments([]);
    }

    const { data: saveRows } = await supabase
      .from('daily_saves')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .order('date', { ascending: false });
    setDailySaves((saveRows ?? []).map(mapSave));

    const { data: sentInviteRows } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    setSentInvites((sentInviteRows ?? []).map(mapInvite));

    const { data: conversationRows } = await supabase
      .from('conversations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);
    const mappedConversations = (conversationRows ?? []).map(mapConversation);
    setConversations(mappedConversations);

    const conversationIds = mappedConversations.map((c) => c.id);
    if (conversationIds.length > 0) {
      const { data: messageRows } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });
      setMessages((messageRows ?? []).map(mapMessage));
    } else {
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setCurrentUser(null);
      setWorkspaces([]);
      setActiveWorkspaceId(null);
      setMembers([]);
      setTasks([]);
      setNotes([]);
      setHandoffs([]);
      setDailySaves([]);
      setMyInvites([]);
      setSentInvites([]);
      setNotifications([]);
      setConversations([]);
      setMessages([]);
      setAttachments([]);
      setBootstrapError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function runBootstrap(userId: string) {
      const email = session!.user.email ?? '';
      const name = (session!.user.user_metadata?.name as string) || email.split('@')[0] || 'Kullanıcı';

      // Her adımda `error` alanı ayrıca kontrol edilip throw ediliyor —
      // supabase-js ağ hatalarında (offline vb.) reject etmek yerine
      // `{data: null, error: {...}}` şeklinde sessizce çözümleniyor. Sadece
      // `data`'ya bakılsaydı bu durum "yeni kullanıcı, henüz workspace'i yok"
      // ile ayırt edilemezdi ve bootstrap sessizce yanlış (boş) bir duruma
      // düşerdi — `.maybeSingle()`'da gerçekten satır yoksa zaten `error`
      // null döner, bu yüzden bu kontrol yanlış pozitif üretmez.
      let { data: userRow, error: userSelectError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (userSelectError) throw new Error(userSelectError.message);
      if (!userRow) {
        const { data: inserted, error } = await supabase
          .from('users')
          .insert({ id: userId, name, email })
          .select()
          .single();
        if (error) throw new Error(error.message);
        userRow = inserted;
      }

      let { data: memberRows, error: memberSelectError } = await supabase
        .from('workspace_members')
        .select('*, workspace:workspaces(*)')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true });
      if (memberSelectError) throw new Error(memberSelectError.message);

      if (!memberRows || memberRows.length === 0) {
        const { data: newWorkspace, error: wsError } = await supabase
          .from('workspaces')
          .insert({ name: `${name} Workspace`, owner_id: userId, type: 'personal' })
          .select()
          .single();
        if (wsError) throw new Error(wsError.message);
        if (newWorkspace) {
          const { error: memError } = await supabase
            .from('workspace_members')
            .insert({ workspace_id: newWorkspace.id, user_id: userId, role: 'owner' });
          if (memError) throw new Error(memError.message);
          memberRows = [{ workspace: newWorkspace }] as any;
        }
      }

      if (cancelled || !userRow || !memberRows || memberRows.length === 0) {
        return;
      }

      setCurrentUser(mapUser(userRow));
      const wsList = memberRows.map((m: any) => mapWorkspace(m.workspace));
      setWorkspaces(wsList);

      const storedId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const resolvedId = wsList.find((w) => w.id === storedId)?.id ?? wsList[0].id;
      setActiveWorkspaceId(resolvedId);

      const { data: inviteRows } = await supabase
        .from('workspace_invites')
        .select('*')
        .eq('status', 'pending')
        .ilike('email', email);
      if (!cancelled) setMyInvites((inviteRows ?? []).map(mapInvite));

      const { data: notificationRows } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) setNotifications((notificationRows ?? []).map(mapNotification));

      await loadWorkspaceData(resolvedId, userId);
    }

    (async () => {
      setLoading(true);
      setBootstrapError(null);
      try {
        // supabase-js, ağ hatalarında (offline vb.) hemen reject etmek yerine
        // birkaç kez artan aralıklarla sessizce yeniden dener — bu da gerçek
        // bir kopukluk anında kullanıcıyı ~20-30 saniye boş bir spinner'da
        // bırakır ve sonunda boş veriyle devam eder. Zaman aşımı ile bunu
        // makul bir sürede (tekrar denenebilir) bir hataya çeviriyoruz.
        await Promise.race([
          runBootstrap(userId),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Sunucuya ulaşılamadı (zaman aşımı).')), 15000)
          ),
        ]);
      } catch (err) {
        // Teknik detay (ör. "TypeError: Failed to fetch") sadece console'a
        // gider — kullanıcıya her zaman anlaşılır, tek tip bir mesaj gösterilir.
        console.error('[Rutin] uygulama başlatılamadı:', err);
        if (!cancelled) {
          setBootstrapError('Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id, bootstrapAttempt]);

  const retryBootstrap = useCallback(() => setBootstrapAttempt((n) => n + 1), []);

  // `tasks` state'ini realtime callback'leri için bir ref'te de tutuyoruz —
  // kanal aboneliği workspace değişmedikçe yeniden kurulmuyor, callback'ler
  // içeride `tasks`'ı closure'dan değil ref'ten okumalı ki her zaman güncel
  // olsun (yoksa abonelik anındaki eski `tasks` ile kilitli kalırlardı).
  const tasksRef = useRef<Task[]>([]);
  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // `messages` postgres_changes aboneliğinin hangi conversation_id'lerin bana
  // ait olduğunu bilmesi için (RLS zaten filtreliyor ama gereksiz payload'ları
  // erken elemek için) güncel conversation listesini ref'te tutuyoruz.
  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Aktif workspace'e ait canlı senkronizasyon: görev, checklist, not, devir,
  // üye ve davet değişiklikleri diğer açık oturumlara anında yansır.
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const channel = supabase.channel(`workspace:${activeWorkspaceId}`);

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `workspace_id=eq.${activeWorkspaceId}` },
      (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          return;
        }
        supabase
          .from('tasks')
          .select('*, checklist:task_checklists(*)')
          .eq('id', payload.new.id)
          .maybeSingle()
          .then(
            ({ data }) => {
              if (!data) return;
              const mapped = mapTask(data);
              setTasks((prev) => {
                const exists = prev.some((t) => t.id === mapped.id);
                return exists ? prev.map((t) => (t.id === mapped.id ? mapped : t)) : [mapped, ...prev];
              });
            },
            (err) => console.error('[Rutin] realtime görev güncellemesi alınamadı:', err)
          );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_checklists' },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!tasksRef.current.some((t) => t.id === row.task_id)) return;
        supabase
          .from('tasks')
          .select('*, checklist:task_checklists(*)')
          .eq('id', row.task_id)
          .maybeSingle()
          .then(
            ({ data }) => {
              if (!data) return;
              const mapped = mapTask(data);
              setTasks((prev) => prev.map((t) => (t.id === row.task_id ? mapped : t)));
            },
            (err) => console.error('[Rutin] realtime checklist güncellemesi alınamadı:', err)
          );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_notes' },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!tasksRef.current.some((t) => t.id === row.task_id)) return;
        if (payload.eventType === 'DELETE') {
          setNotes((prev) => prev.filter((n) => n.id !== row.id));
          return;
        }
        const mapped = mapNote(payload.new);
        setNotes((prev) =>
          prev.some((n) => n.id === mapped.id) ? prev.map((n) => (n.id === mapped.id ? mapped : n)) : [...prev, mapped]
        );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_attachments' },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!tasksRef.current.some((t) => t.id === row.task_id)) return;
        if (payload.eventType === 'DELETE') {
          setAttachments((prev) => prev.filter((a) => a.id !== row.id));
          return;
        }
        const mapped = mapAttachment(payload.new);
        setAttachments((prev) =>
          prev.some((a) => a.id === mapped.id) ? prev.map((a) => (a.id === mapped.id ? mapped : a)) : [...prev, mapped]
        );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_handoffs' },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!tasksRef.current.some((t) => t.id === row.task_id)) return;
        if (payload.eventType === 'DELETE') {
          setHandoffs((prev) => prev.filter((h) => h.id !== row.id));
          return;
        }
        const mapped = mapHandoff(payload.new);
        setHandoffs((prev) =>
          prev.some((h) => h.id === mapped.id) ? prev.map((h) => (h.id === mapped.id ? mapped : h)) : [...prev, mapped]
        );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workspace_members', filter: `workspace_id=eq.${activeWorkspaceId}` },
      (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setMembers((prev) => prev.filter((m) => m.id !== payload.old.id));
          return;
        }
        const row = payload.new;
        supabase
          .from('users')
          .select('*')
          .eq('id', row.user_id)
          .maybeSingle()
          .then(
            ({ data: userRow }) => {
              if (!userRow) return;
              const member: Member = {
                id: row.id,
                workspaceId: row.workspace_id,
                userId: row.user_id,
                role: row.role,
                joinedAt: row.joined_at,
                user: mapUser(userRow),
              };
              setMembers((prev) => {
                const exists = prev.some((m) => m.id === member.id);
                return exists ? prev.map((m) => (m.id === member.id ? member : m)) : [...prev, member];
              });
            },
            (err) => console.error('[Rutin] realtime üye güncellemesi alınamadı:', err)
          );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'workspace_invites', filter: `workspace_id=eq.${activeWorkspaceId}` },
      (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setSentInvites((prev) => prev.filter((i) => i.id !== payload.old.id));
          return;
        }
        const mapped = mapInvite(payload.new);
        setSentInvites((prev) =>
          prev.some((i) => i.id === mapped.id) ? prev.map((i) => (i.id === mapped.id ? mapped : i)) : [mapped, ...prev]
        );
      }
    );

    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'conversations', filter: `workspace_id=eq.${activeWorkspaceId}` },
      (payload: any) => {
        if (payload.eventType === 'DELETE') {
          setConversations((prev) => prev.filter((c) => c.id !== payload.old.id));
          return;
        }
        const mapped = mapConversation(payload.new);
        setConversations((prev) =>
          prev.some((c) => c.id === mapped.id) ? prev.map((c) => (c.id === mapped.id ? mapped : c)) : [...prev, mapped]
        );
      }
    );

    // `messages` tablosunda workspace_id yok — RLS zaten sadece katılımcı
    // olduğum satırları gönderir, `conversationsRef` ile de gereksiz
    // payload'ları erken eleriz (tasksRef ile aynı desen).
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages' },
      (payload: any) => {
        const row = payload.new ?? payload.old;
        if (!conversationsRef.current.some((c) => c.id === row.conversation_id)) return;
        if (payload.eventType === 'DELETE') {
          setMessages((prev) => prev.filter((m) => m.id !== row.id));
          return;
        }
        const mapped = mapMessage(payload.new);
        setMessages((prev) =>
          prev.some((m) => m.id === mapped.id) ? prev.map((m) => (m.id === mapped.id ? mapped : m)) : [...prev, mapped]
        );
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId]);

  // Bana (e-postama) gelen davetler — hangi workspace'den geldiğine
  // bakmaksızın, oturum boyunca dinlenir (aktif workspace'e bağlı değil).
  useEffect(() => {
    const email = session?.user.email;
    if (!email) return;
    const normalizedEmail = email.toLowerCase();

    const channel = supabase
      .channel(`my-invites:${normalizedEmail}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_invites', filter: `email=eq.${normalizedEmail}` },
        (payload: any) => {
          const row = payload.new ?? payload.old;
          if (payload.eventType === 'DELETE' || row.status !== 'pending') {
            setMyInvites((prev) => prev.filter((i) => i.id !== row.id));
            return;
          }
          const mapped = mapInvite(row);
          setMyInvites((prev) =>
            prev.some((i) => i.id === mapped.id) ? prev.map((i) => (i.id === mapped.id ? mapped : i)) : [...prev, mapped]
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.email]);

  // Bana gelen bildirimler — workspace'ten bağımsız, oturum boyunca dinlenir.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const mapped = mapNotification(payload.new);
          setNotifications((prev) => (prev.some((n) => n.id === mapped.id) ? prev : [mapped, ...prev]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user.id]);

  const getTask = useCallback((taskId: string) => tasks.find((t) => t.id === taskId), [tasks]);
  const getUser = useCallback(
    (userId: string) => members.find((m) => m.userId === userId)?.user,
    [members]
  );
  const getTaskNotes = useCallback(
    (taskId: string) =>
      notes.filter((n) => n.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [notes]
  );
  const getTaskHandoffs = useCallback(
    (taskId: string) => handoffs.filter((h) => h.taskId === taskId),
    [handoffs]
  );
  const getSubtasks = useCallback(
    (taskId: string) => tasks.filter((t) => t.parentTaskId === taskId),
    [tasks]
  );
  const getConversationMessages = useCallback(
    (conversationId: string) =>
      messages.filter((m) => m.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );
  const getOtherParticipant = useCallback(
    (conversation: Conversation) => {
      const otherId = conversation.userOneId === currentUser?.id ? conversation.userTwoId : conversation.userOneId;
      return getUser(otherId);
    },
    [currentUser, getUser]
  );
  const unreadCountForConversation = useCallback(
    (conversationId: string) =>
      messages.filter((m) => m.conversationId === conversationId && m.senderId !== currentUser?.id && !m.readAt).length,
    [messages, currentUser]
  );
  const getTaskAttachments = useCallback(
    (taskId: string) =>
      attachments.filter((a) => a.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [attachments]
  );

  const createTask = useCallback(
    async (input: Partial<Task> & { title: string }) => {
      if (!workspace.id || !currentUser) throw new Error('Workspace hazır değil');
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspace.id,
          parent_task_id: input.parentTaskId ?? null,
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? null,
          status: input.status ?? 'pending',
          priority: input.priority ?? 'medium',
          progress: 0,
          progress_mode: input.progressMode ?? 'manual',
          assigned_to: input.assignedTo ?? currentUser.id,
          created_by: currentUser.id,
          start_date: input.startDate ?? null,
          due_date: input.dueDate ?? null,
          tags: input.tags ?? [],
        })
        .select('*, checklist:task_checklists(*)')
        .single();

      if (error || !data) throw new Error(error?.message ?? 'Görev oluşturulamadı');
      const task = mapTask(data);
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [workspace.id, currentUser]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw new Error(error.message);
      // DB'de checklist/not/devir/ek ve alt görevler zaten ON DELETE CASCADE
      // ile siliniyor — burada sadece yerel state'i aynı şekilde temizliyoruz.
      const removedIds = new Set([taskId, ...tasks.filter((t) => t.parentTaskId === taskId).map((t) => t.id)]);
      setTasks((prev) => prev.filter((t) => !removedIds.has(t.id)));
      setNotes((prev) => prev.filter((n) => !removedIds.has(n.taskId)));
      setHandoffs((prev) => prev.filter((h) => !removedIds.has(h.taskId)));
      setAttachments((prev) => prev.filter((a) => !removedIds.has(a.taskId)));
    },
    [tasks]
  );

  // Bir alt görevin durumu değişince (veya yeni bir alt görev eklenince) üst
  // görevin ilerlemesini alt görevlerin tamamlanma oranından yeniden hesaplar
  // — ama sadece üst görevin progressMode'u 'subtask' ise.
  const recomputeParentProgress = useCallback(
    (parentTaskId: string, tasksSnapshot: Task[]) => {
      const parent = tasksSnapshot.find((t) => t.id === parentTaskId);
      if (!parent || parent.progressMode !== 'subtask') return;
      const children = tasksSnapshot.filter((t) => t.parentTaskId === parentTaskId);
      if (children.length === 0) return;
      const completed = children.filter((c) => c.status === 'completed').length;
      const newProgress = Math.round((completed / children.length) * 100);
      if (newProgress === parent.progress) return;
      setTasks((prev) => prev.map((t) => (t.id === parentTaskId ? { ...t, progress: newProgress } : t)));
      supabase
        .from('tasks')
        .update({ progress: newProgress })
        .eq('id', parentTaskId)
        .then(
          ({ error }) => {
            if (error) console.error('[Rutin] üst görev ilerlemesi güncellenemedi:', error.message);
          },
          (err) => console.error('[Rutin] üst görev ilerlemesi güncellenemedi (bağlantı):', err)
        );
    },
    []
  );

  const addSubtask = useCallback(
    async (parentTaskId: string, input: { title: string; assignedTo?: string }) => {
      if (!workspace.id || !currentUser) throw new Error('Workspace hazır değil');
      const parent = tasks.find((t) => t.id === parentTaskId);
      if (!parent) throw new Error('Üst görev bulunamadı');

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          workspace_id: workspace.id,
          parent_task_id: parentTaskId,
          title: input.title,
          status: 'pending',
          priority: 'medium',
          progress: 0,
          progress_mode: 'manual',
          assigned_to: input.assignedTo ?? currentUser.id,
          created_by: currentUser.id,
          due_date: parent.dueDate ?? null,
          tags: [],
        })
        .select('*, checklist:task_checklists(*)')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Alt görev oluşturulamadı');
      const subtask = mapTask(data);

      let tasksSnapshot = [subtask, ...tasks];
      setTasks(tasksSnapshot);

      // İlk alt görev eklendiğinde üst görevi otomatik olarak 'subtask'
      // ilerleme moduna geçiriyoruz — kullanıcı artık ilerlemeyi alt
      // görevlerden takip etmek istediğini bu eylemle göstermiş oluyor.
      if (parent.progressMode !== 'subtask') {
        tasksSnapshot = tasksSnapshot.map((t) => (t.id === parentTaskId ? { ...t, progressMode: 'subtask' } : t));
        setTasks(tasksSnapshot);
        supabase
          .from('tasks')
          .update({ progress_mode: 'subtask' })
          .eq('id', parentTaskId)
          .then(
            ({ error: modeError }) => {
              if (modeError) console.error('[Rutin] ilerleme modu güncellenemedi:', modeError.message);
            },
            (err) => console.error('[Rutin] ilerleme modu güncellenemedi (bağlantı):', err)
          );
      }

      recomputeParentProgress(parentTaskId, tasksSnapshot);
      return subtask;
    },
    [tasks, workspace.id, currentUser, recomputeParentProgress]
  );

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      const updatedAt = new Date().toISOString();
      const task = tasks.find((t) => t.id === taskId);
      const tasksSnapshot = tasks.map((t) =>
        t.id === taskId ? { ...t, status, progress: status === 'completed' ? 100 : t.progress, updatedAt } : t
      );
      setTasks(tasksSnapshot);
      const patch: Record<string, unknown> = { status, updated_at: updatedAt };
      if (status === 'completed') patch.progress = 100;
      supabase
        .from('tasks')
        .update(patch)
        .eq('id', taskId)
        .then(
          ({ error }) => {
            if (error) console.error('[Rutin] durum güncellenemedi:', error.message);
          },
          (err) => console.error('[Rutin] durum güncellenemedi (bağlantı):', err)
        );

      if (task?.parentTaskId) {
        recomputeParentProgress(task.parentTaskId, tasksSnapshot);
      }
    },
    [tasks, recomputeParentProgress]
  );

  const toggleChecklistItem = useCallback(
    (taskId: string, checklistItemId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      const item = task?.checklist.find((c) => c.id === checklistItemId);
      if (!task || !item) return;
      const newCompleted = !item.completed;

      let newProgress = task.progress;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== taskId) return t;
          const checklist = t.checklist.map((c) =>
            c.id === checklistItemId ? { ...c, completed: newCompleted } : c
          );
          const updated = { ...t, checklist, updatedAt: new Date().toISOString() };
          updated.progress = computeProgress(updated);
          newProgress = updated.progress;
          return updated;
        })
      );

      supabase
        .from('task_checklists')
        .update({ completed: newCompleted })
        .eq('id', checklistItemId)
        .then(
          ({ error }) => {
            if (error) console.error('[Rutin] checklist güncellenemedi:', error.message);
          },
          (err) => console.error('[Rutin] checklist güncellenemedi (bağlantı):', err)
        );

      if (task.progressMode === 'checklist') {
        supabase
          .from('tasks')
          .update({ progress: newProgress })
          .eq('id', taskId)
          .then(
            ({ error }) => {
              if (error) console.error('[Rutin] ilerleme güncellenemedi:', error.message);
            },
            (err) => console.error('[Rutin] ilerleme güncellenemedi (bağlantı):', err)
          );
      }
    },
    [tasks]
  );

  const addChecklistItem = useCallback(
    (taskId: string, text: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      const order = task.checklist.length + 1;

      supabase
        .from('task_checklists')
        .insert({ task_id: taskId, text, completed: false, order })
        .select()
        .single()
        .then(
          ({ data, error }) => {
            if (error || !data) {
              console.error('[Rutin] checklist maddesi eklenemedi:', error?.message);
              return;
            }
            const item = mapChecklistItem(data);
            setTasks((prev) =>
              prev.map((t) => {
                if (t.id !== taskId) return t;
                const updated = { ...t, checklist: [...t.checklist, item] };
                updated.progress = computeProgress(updated);
                if (updated.progressMode === 'checklist') {
                  supabase
                    .from('tasks')
                    .update({ progress: updated.progress })
                    .eq('id', taskId)
                    .then(
                      ({ error: progError }) => {
                        if (progError) console.error('[Rutin] ilerleme güncellenemedi:', progError.message);
                      },
                      (err) => console.error('[Rutin] ilerleme güncellenemedi (bağlantı):', err)
                    );
                }
                return updated;
              })
            );
          },
          (err) => console.error('[Rutin] checklist maddesi eklenemedi (bağlantı):', err)
        );
    },
    [tasks]
  );

  const addNote = useCallback(
    (taskId: string, content: string, type: NoteType = 'personal') => {
      if (!currentUser) return;
      supabase
        .from('task_notes')
        .insert({ task_id: taskId, user_id: currentUser.id, type, content })
        .select()
        .single()
        .then(
          ({ data, error }) => {
            if (error || !data) {
              console.error('[Rutin] not eklenemedi:', error?.message);
              return;
            }
            setNotes((prev) => [...prev, mapNote(data)]);
          },
          (err) => console.error('[Rutin] not eklenemedi (bağlantı):', err)
        );
    },
    [currentUser]
  );

  const handoffTask = useCallback(
    async (input: {
      taskId: string;
      toUserId: string;
      doneSoFar: string;
      remainingWork: string;
      cautionNotes?: string;
      newPriority?: TaskPriority;
      newDueDate?: string;
    }) => {
      if (!currentUser) throw new Error('Oturum hazır değil');
      const task = tasks.find((t) => t.id === input.taskId);
      if (!task) throw new Error('Görev bulunamadı');
      const now = new Date().toISOString();

      // accepted_status 'pending' — görev fiilen devralan kişiye ancak o
      // kabul edince geçer (bkz. accept_task_handoff / reject_task_handoff).
      const { data: handoffRow, error: handoffError } = await supabase
        .from('task_handoffs')
        .insert({
          task_id: input.taskId,
          from_user_id: currentUser.id,
          to_user_id: input.toUserId,
          current_status: task.status,
          done_so_far: input.doneSoFar,
          remaining_work: input.remainingWork,
          caution_notes: input.cautionNotes ?? null,
          new_priority: input.newPriority ?? null,
          new_due_date: input.newDueDate ?? null,
          accepted_status: 'pending',
        })
        .select()
        .single();
      if (handoffError || !handoffRow) throw new Error(handoffError?.message ?? 'Devir kaydı oluşturulamadı');
      setHandoffs((prev) => [...prev, mapHandoff(handoffRow)]);

      const handoffNoteContent = [
        `Şu ana kadar yapılanlar: ${input.doneSoFar}`,
        `Kalan işler: ${input.remainingWork}`,
        input.cautionNotes ? `Dikkat edilmesi gerekenler: ${input.cautionNotes}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const { data: noteRow, error: noteError } = await supabase
        .from('task_notes')
        .insert({ task_id: input.taskId, user_id: currentUser.id, type: 'handoff_note', content: handoffNoteContent })
        .select()
        .single();
      if (noteError) console.error('[Rutin] devir notu eklenemedi:', noteError.message);
      if (noteRow) setNotes((prev) => [...prev, mapNote(noteRow)]);

      const { data: updatedTaskRow, error: taskError } = await supabase
        .from('tasks')
        .update({ status: 'handed_off', updated_at: now })
        .eq('id', input.taskId)
        .select('*, checklist:task_checklists(*)')
        .single();
      if (taskError || !updatedTaskRow) throw new Error(taskError?.message ?? 'Görev güncellenemedi');
      const updatedTask = mapTask(updatedTaskRow);
      setTasks((prev) => prev.map((t) => (t.id === input.taskId ? updatedTask : t)));
    },
    [tasks, currentUser]
  );

  const acceptHandoff = useCallback(async (handoffId: string) => {
    const { error } = await supabase.rpc('accept_task_handoff', { handoff_id: handoffId });
    if (error) throw new Error(error.message);

    const { data: handoffRow } = await supabase.from('task_handoffs').select('*').eq('id', handoffId).single();
    if (handoffRow) {
      setHandoffs((prev) => prev.map((h) => (h.id === handoffId ? mapHandoff(handoffRow) : h)));
      const { data: taskRow } = await supabase
        .from('tasks')
        .select('*, checklist:task_checklists(*)')
        .eq('id', handoffRow.task_id)
        .maybeSingle();
      if (taskRow) {
        const updatedTask = mapTask(taskRow);
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      }
    }
  }, []);

  const rejectHandoff = useCallback(async (handoffId: string) => {
    const { error } = await supabase.rpc('reject_task_handoff', { handoff_id: handoffId });
    if (error) throw new Error(error.message);

    const { data: handoffRow } = await supabase.from('task_handoffs').select('*').eq('id', handoffId).single();
    if (handoffRow) {
      setHandoffs((prev) => prev.map((h) => (h.id === handoffId ? mapHandoff(handoffRow) : h)));
      const { data: taskRow } = await supabase
        .from('tasks')
        .select('*, checklist:task_checklists(*)')
        .eq('id', handoffRow.task_id)
        .maybeSingle();
      if (taskRow) {
        const updatedTask = mapTask(taskRow);
        setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      }
    }
  }, []);

  const todaySave = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return dailySaves.find((s) => s.date === todayStr);
  }, [dailySaves]);

  const saveDay = useCallback(
    async (dailyNote: string) => {
      if (!currentUser || !workspace.id) throw new Error('Workspace hazır değil');
      const todayStr = new Date().toISOString().slice(0, 10);
      const myTasks = tasks.filter((t) => t.assignedTo === currentUser.id && t.dueDate === todayStr);
      const completedTasks = myTasks.filter((t) => t.status === 'completed').length;
      const failedTasks = myTasks.filter((t) => t.status === 'failed').length;
      const postponedTasks = myTasks.filter((t) => t.status === 'postponed').length;
      const total = myTasks.length || 1;
      const successRate = Math.round((completedTasks / total) * 100);

      const { data, error } = await supabase
        .from('daily_saves')
        .upsert(
          {
            user_id: currentUser.id,
            workspace_id: workspace.id,
            date: todayStr,
            completed_tasks: completedTasks,
            failed_tasks: failedTasks,
            postponed_tasks: postponedTasks,
            success_rate: successRate,
            daily_note: dailyNote,
          },
          { onConflict: 'user_id,workspace_id,date' }
        )
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Save alınamadı');

      const save = mapSave(data);
      setDailySaves((prev) => [save, ...prev.filter((s) => s.date !== todayStr)]);
      return save;
    },
    [tasks, currentUser, workspace.id]
  );

  // Not: burada bilinçli olarak `loading`'i true yapmıyoruz — AppStoreProvider
  // `loading` true olduğunda tüm children'ı (Stack navigator dahil) unmount
  // edip LoadingScreen gösteriyor, bu da Expo Router'ın navigasyon state'ini
  // kaybedip splash'e resetlenmesine yol açıyor. Workspace geçişi bu yüzden
  // ekranı kilitlemeden, veri sessizce güncellenerek yapılır.
  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      if (!currentUser || workspaceId === activeWorkspaceId) return;
      await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, workspaceId);
      setActiveWorkspaceId(workspaceId);
      await loadWorkspaceData(workspaceId, currentUser.id);
    },
    [currentUser, activeWorkspaceId, loadWorkspaceData]
  );

  const inviteMember = useCallback(
    async (email: string, role: InviteRole) => {
      if (!currentUser || !workspace.id) throw new Error('Workspace hazır değil');
      const normalized = email.trim().toLowerCase();
      const alreadyMember = members.some((m) => m.user.email.toLowerCase() === normalized);
      if (alreadyMember) throw new Error('Bu kişi zaten workspace üyesi');
      const alreadyInvited = sentInvites.some(
        (i) => i.status === 'pending' && i.email.toLowerCase() === normalized
      );
      if (alreadyInvited) throw new Error('Bu kişiye zaten bekleyen bir davet var');

      const { data, error } = await supabase
        .from('workspace_invites')
        .insert({ workspace_id: workspace.id, email: normalized, role, invited_by: currentUser.id })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Davet gönderilemedi');
      setSentInvites((prev) => [mapInvite(data), ...prev]);

      sendInviteEmail(data.id).catch((err) => console.error('[Rutin] davet e-postası gönderilemedi:', err));
    },
    [currentUser, workspace.id, members, sentInvites]
  );

  const removeMember = useCallback(
    async (userId: string) => {
      if (!workspace.id) throw new Error('Workspace hazır değil');
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace.id)
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    },
    [workspace.id]
  );

  const cancelInvite = useCallback(async (inviteId: string) => {
    const { data, error } = await supabase
      .from('workspace_invites')
      .update({ status: 'cancelled', resolved_at: new Date().toISOString() })
      .eq('id', inviteId)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Davet iptal edilemedi');
    setSentInvites((prev) => prev.map((i) => (i.id === inviteId ? mapInvite(data) : i)));
  }, []);

  const acceptInvite = useCallback(
    async (inviteId: string) => {
      if (!currentUser) throw new Error('Oturum hazır değil');
      const invite = myInvites.find((i) => i.id === inviteId);
      const { error } = await supabase.rpc('accept_workspace_invite', { invite_id: inviteId });
      if (error) throw new Error(error.message);

      setMyInvites((prev) => prev.filter((i) => i.id !== inviteId));

      const { data: memberRows } = await supabase
        .from('workspace_members')
        .select('*, workspace:workspaces(*)')
        .eq('user_id', currentUser.id)
        .order('joined_at', { ascending: true });
      const wsList = (memberRows ?? []).map((m: any) => mapWorkspace(m.workspace));
      setWorkspaces(wsList);

      if (invite) {
        await switchWorkspace(invite.workspaceId);
      }
    },
    [currentUser, myInvites, switchWorkspace]
  );

  const declineInvite = useCallback(async (inviteId: string) => {
    const { error } = await supabase.rpc('decline_workspace_invite', { invite_id: inviteId });
    if (error) throw new Error(error.message);
    setMyInvites((prev) => prev.filter((i) => i.id !== inviteId));
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .then(
        ({ error }) => {
          if (error) console.error('[Rutin] bildirim okundu işaretlenemedi:', error.message);
        },
        (err) => console.error('[Rutin] bildirim okundu işaretlenemedi (bağlantı):', err)
      );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    if (!currentUser) return;
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUser.id)
      .in('id', unreadIds)
      .then(
        ({ error }) => {
          if (error) console.error('[Rutin] bildirimler okundu işaretlenemedi:', error.message);
        },
        (err) => console.error('[Rutin] bildirimler okundu işaretlenemedi (bağlantı):', err)
      );
  }, [notifications, currentUser]);

  const getOrCreateConversation = useCallback(
    async (otherUserId: string) => {
      if (!currentUser || !workspace.id) throw new Error('Workspace hazır değil');
      // DB'deki "user_one_id < user_two_id" constraint'i client'ta da garanti
      // edilmeli — aksi halde A-B ve B-A için ayrı satır oluşturmayı deneriz.
      const [userOneId, userTwoId] = [currentUser.id, otherUserId].sort();

      const existing = conversations.find(
        (c) => c.userOneId === userOneId && c.userTwoId === userTwoId && c.workspaceId === workspace.id
      );
      if (existing) return existing;

      const { data, error } = await supabase
        .from('conversations')
        .insert({ workspace_id: workspace.id, user_one_id: userOneId, user_two_id: userTwoId })
        .select()
        .single();

      if (error || !data) {
        // Aynı anda karşı taraf da oluşturmaya çalışmış olabilir (unique
        // constraint çakışması) — bu durumda mevcut satırı çekip kullanırız.
        const { data: existingRow } = await supabase
          .from('conversations')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('user_one_id', userOneId)
          .eq('user_two_id', userTwoId)
          .maybeSingle();
        if (existingRow) {
          const mapped = mapConversation(existingRow);
          setConversations((prev) => (prev.some((c) => c.id === mapped.id) ? prev : [...prev, mapped]));
          return mapped;
        }
        throw new Error(error?.message ?? 'Sohbet oluşturulamadı');
      }

      const mapped = mapConversation(data);
      setConversations((prev) => [...prev, mapped]);
      return mapped;
    },
    [currentUser, workspace.id, conversations]
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('[Rutin] mesajlar yüklenemedi:', error.message);
      return;
    }
    const mapped = (data ?? []).map(mapMessage);
    setMessages((prev) => [...prev.filter((m) => m.conversationId !== conversationId), ...mapped]);
  }, []);

  const sendMessage = useCallback(
    async (conversationId: string, content: string) => {
      if (!currentUser) throw new Error('Oturum hazır değil');
      const trimmed = content.trim();
      if (!trimmed) return;
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: currentUser.id, content: trimmed })
        .select()
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Mesaj gönderilemedi');
      const mapped = mapMessage(data);
      setMessages((prev) => (prev.some((m) => m.id === mapped.id) ? prev : [...prev, mapped]));
    },
    [currentUser]
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!currentUser) return;
      const unreadIds = messages
        .filter((m) => m.conversationId === conversationId && m.senderId !== currentUser.id && !m.readAt)
        .map((m) => m.id);
      if (unreadIds.length === 0) return;
      const now = new Date().toISOString();
      setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, readAt: now } : m)));
      supabase
        .from('messages')
        .update({ read_at: now })
        .in('id', unreadIds)
        .then(
          ({ error }) => {
            if (error) console.error('[Rutin] mesajlar okundu işaretlenemedi:', error.message);
          },
          (err) => console.error('[Rutin] mesajlar okundu işaretlenemedi (bağlantı):', err)
        );
    },
    [messages, currentUser]
  );

  const uploadAttachment = useCallback(
    async (
      taskId: string,
      file: { uri: string; name: string; mimeType: string; kind: AttachmentKind; durationSeconds?: number }
    ) => {
      if (!currentUser || !workspace.id) throw new Error('Workspace hazır değil');
      // fetch(uri).blob() hem web'de (blob:/data: URI) hem native'de (file:// URI)
      // aynı şekilde çalışır — expo-file-system'in File sınıfı web'de desteklenmiyor.
      const blob = await (await fetch(file.uri)).blob();
      const dotIndex = file.name.lastIndexOf('.');
      const ext = dotIndex >= 0 ? file.name.slice(dotIndex) : '';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      const storagePath = `${workspace.id}/${taskId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(storagePath, blob, { contentType: file.mimeType });
      if (uploadError) throw new Error(uploadError.message);

      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          uploaded_by: currentUser.id,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.mimeType,
          kind: file.kind,
          size_bytes: blob.size,
          duration_seconds: file.durationSeconds != null ? Math.round(file.durationSeconds) : null,
        })
        .select()
        .single();
      if (error || !data) {
        // Satır eklenemedi — Storage'da yetim dosya kalmasın diye temizle.
        await supabase.storage.from('task-attachments').remove([storagePath]);
        throw new Error(error?.message ?? 'Ek eklenemedi');
      }

      const mapped = mapAttachment(data);
      setAttachments((prev) => (prev.some((a) => a.id === mapped.id) ? prev : [...prev, mapped]));
      return mapped;
    },
    [currentUser, workspace.id]
  );

  const getAttachmentUrl = useCallback(async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(storagePath, 3600);
    if (error || !data) throw new Error(error?.message ?? 'Bağlantı oluşturulamadı');
    return data.signedUrl;
  }, []);

  const deleteAttachment = useCallback(
    async (attachmentId: string) => {
      const attachment = attachments.find((a) => a.id === attachmentId);
      if (!attachment) return;
      await supabase.storage.from('task-attachments').remove([attachment.storagePath]);
      const { error } = await supabase.from('task_attachments').delete().eq('id', attachmentId);
      if (error) throw new Error(error.message);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    },
    [attachments]
  );

  const value: AppStoreValue = {
    loading,
    currentUser: currentUser ?? EMPTY_USER,
    users: members.map((m) => m.user),
    workspace,
    workspaces,
    members,
    tasks,
    notes,
    handoffs,
    dailySaves,
    myInvites,
    sentInvites,
    myPendingHandoffs: handoffs.filter((h) => h.toUserId === currentUser?.id && h.acceptedStatus === 'pending'),
    notifications,
    unreadNotificationCount: notifications.filter((n) => !n.read).length,
    conversations,
    messages,
    unreadMessageCount: messages.filter((m) => m.senderId !== currentUser?.id && !m.readAt).length,
    attachments,
    getTask,
    getUser,
    getTaskNotes,
    getTaskHandoffs,
    getSubtasks,
    getConversationMessages,
    getOtherParticipant,
    unreadCountForConversation,
    getTaskAttachments,
    createTask,
    deleteTask,
    addSubtask,
    updateTaskStatus,
    toggleChecklistItem,
    addChecklistItem,
    addNote,
    handoffTask,
    acceptHandoff,
    rejectHandoff,
    saveDay,
    todaySave,
    switchWorkspace,
    inviteMember,
    removeMember,
    cancelInvite,
    acceptInvite,
    declineInvite,
    markNotificationRead,
    markAllNotificationsRead,
    getOrCreateConversation,
    loadMessages,
    sendMessage,
    markConversationRead,
    uploadAttachment,
    getAttachmentUrl,
    deleteAttachment,
  };

  if (session && loading) {
    return <LoadingScreen />;
  }

  // Bootstrap hiç tamamlanamadıysa (örn. internet yok) elimizde gösterecek
  // hiçbir veri yok — sonsuz boş ekran yerine tekrar deneme seçeneği sunuyoruz.
  // `currentUser` varsa (kısmi başarı) uygulamayı normal akışında bırakıyoruz.
  if (session && bootstrapError && !currentUser) {
    return <BootstrapErrorScreen message={bootstrapError} onRetry={retryBootstrap} />;
  }

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

function LoadingScreen() {
  const { theme } = useAppTheme();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator color={theme.accent} size="large" />
    </View>
  );
}

function BootstrapErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { theme } = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
        padding: 24,
        gap: 16,
      }}
    >
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
        Bağlantı kurulamadı
      </Text>
      <Text style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center' }}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={{
          backgroundColor: theme.accent,
          borderRadius: 10,
          paddingHorizontal: 20,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: theme.accentText, fontWeight: '700' }}>Tekrar dene</Text>
      </Pressable>
    </View>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error('useAppStore must be used within AppStoreProvider');
  return ctx;
}
