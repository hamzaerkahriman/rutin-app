import {
  DailySave,
  MotivationContent,
  Task,
  TaskHandoff,
  TaskNote,
  User,
  Workspace,
  WorkspaceMember,
} from '../types';

export const mockUsers: User[] = [
  { id: 'user_001', name: 'Hamza', email: 'hamza@example.com', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'user_002', name: 'Elif Kaya', email: 'elif@example.com', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'user_003', name: 'Baran Yıldız', email: 'baran@example.com', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'user_004', name: 'Selin Aksoy', email: 'selin@example.com', createdAt: '2026-06-01T09:00:00Z' },
];

export const currentUser = mockUsers[0];

export const mockWorkspace: Workspace = {
  id: 'workspace_001',
  name: 'Rutin Workspace',
  ownerId: 'user_001',
  type: 'team',
  createdAt: '2026-06-01T09:00:00Z',
};

export const mockMembers: WorkspaceMember[] = [
  { id: 'member_001', workspaceId: 'workspace_001', userId: 'user_001', role: 'owner', joinedAt: '2026-06-01T09:00:00Z' },
  { id: 'member_002', workspaceId: 'workspace_001', userId: 'user_002', role: 'admin', joinedAt: '2026-06-01T09:10:00Z' },
  { id: 'member_003', workspaceId: 'workspace_001', userId: 'user_003', role: 'member', joinedAt: '2026-06-02T09:00:00Z' },
  { id: 'member_004', workspaceId: 'workspace_001', userId: 'user_004', role: 'member', joinedAt: '2026-06-03T09:00:00Z' },
];

const today = new Date().toISOString().slice(0, 10);

export const mockTasks: Task[] = [
  {
    id: 'task_001',
    workspaceId: 'workspace_001',
    title: 'Ana ekran tasarımını tamamla',
    description: 'Motivasyon ekranı ve dashboard tasarımı hazırlanacak.',
    category: 'design',
    status: 'in_progress',
    priority: 'high',
    progress: 60,
    progressMode: 'checklist',
    assignedTo: 'user_002',
    createdBy: 'user_001',
    startDate: '2026-07-01',
    dueDate: today,
    tags: ['design', 'mobile'],
    checklist: [
      { id: 'check_001', taskId: 'task_001', text: 'Motivasyon ekranını çiz', completed: true, order: 1 },
      { id: 'check_002', taskId: 'task_001', text: 'Dashboard kartlarını hazırla', completed: true, order: 2 },
      { id: 'check_003', taskId: 'task_001', text: 'Checklist ekranını çiz', completed: true, order: 3 },
      { id: 'check_004', taskId: 'task_001', text: 'Mobil görünüm kontrolü', completed: false, order: 4 },
      { id: 'check_005', taskId: 'task_001', text: 'Karanlık mod kontrolü', completed: false, order: 5 },
    ],
    createdAt: '2026-07-01T10:00:00Z',
    updatedAt: '2026-07-05T12:30:00Z',
  },
  {
    id: 'task_002',
    workspaceId: 'workspace_001',
    title: 'Supabase şemasını kur',
    description: 'Users, workspaces, tasks tablolarını migration olarak yaz.',
    category: 'backend',
    status: 'pending',
    priority: 'critical',
    progress: 0,
    progressMode: 'manual',
    assignedTo: 'user_001',
    createdBy: 'user_001',
    startDate: today,
    dueDate: today,
    tags: ['backend', 'supabase'],
    checklist: [],
    createdAt: '2026-07-05T08:00:00Z',
    updatedAt: '2026-07-05T08:00:00Z',
  },
  {
    id: 'task_003',
    workspaceId: 'workspace_001',
    title: 'Haftalık sosyal medya içerik planı',
    description: 'Instagram ve LinkedIn için içerik takvimi hazırlanacak.',
    category: 'content',
    status: 'handed_off',
    priority: 'medium',
    progress: 40,
    progressMode: 'checklist',
    assignedTo: 'user_004',
    createdBy: 'user_003',
    startDate: '2026-06-30',
    dueDate: '2026-07-08',
    tags: ['content', 'social'],
    checklist: [
      { id: 'check_006', taskId: 'task_003', text: 'Instagram takvimi', completed: true, order: 1 },
      { id: 'check_007', taskId: 'task_003', text: 'LinkedIn takvimi', completed: false, order: 2 },
      { id: 'check_008', taskId: 'task_003', text: 'Görsel brief', completed: false, order: 3 },
    ],
    createdAt: '2026-06-30T09:00:00Z',
    updatedAt: '2026-07-04T15:00:00Z',
  },
  {
    id: 'task_004',
    workspaceId: 'workspace_001',
    title: 'Sabah sporu',
    description: '30 dakika kardiyo.',
    category: 'kişisel',
    status: 'completed',
    priority: 'low',
    progress: 100,
    progressMode: 'manual',
    assignedTo: 'user_001',
    createdBy: 'user_001',
    startDate: today,
    dueDate: today,
    tags: ['spor'],
    checklist: [],
    createdAt: '2026-07-05T06:00:00Z',
    updatedAt: '2026-07-05T07:00:00Z',
  },
  {
    id: 'task_005',
    workspaceId: 'workspace_001',
    title: 'Müşteri sunumu hazırlığı',
    description: 'Q3 sonuçları için slaytlar hazırlanacak.',
    category: 'sunum',
    status: 'failed',
    priority: 'high',
    progress: 20,
    progressMode: 'manual',
    assignedTo: 'user_003',
    createdBy: 'user_001',
    startDate: '2026-07-02',
    dueDate: '2026-07-04',
    tags: ['satış'],
    checklist: [],
    createdAt: '2026-07-02T09:00:00Z',
    updatedAt: '2026-07-04T18:00:00Z',
  },
  {
    id: 'task_006',
    workspaceId: 'workspace_001',
    title: 'Kişisel bütçe gözden geçirme',
    status: 'postponed',
    priority: 'low',
    progress: 0,
    progressMode: 'manual',
    assignedTo: 'user_001',
    createdBy: 'user_001',
    dueDate: today,
    tags: [],
    checklist: [],
    createdAt: '2026-07-03T09:00:00Z',
    updatedAt: '2026-07-05T09:00:00Z',
  },
];

export const mockNotes: TaskNote[] = [
  {
    id: 'note_001',
    taskId: 'task_001',
    userId: 'user_002',
    type: 'personal',
    content: 'Ana ekranın ilk taslağı hazırlandı. Dashboard kartları eksik kaldı.',
    createdAt: '2026-07-03T13:00:00Z',
  },
  {
    id: 'note_002',
    taskId: 'task_001',
    userId: 'user_001',
    type: 'manager_note',
    content: 'Harika gidiyor, mobil görünüme geçince buton hizalarını kontrol et.',
    createdAt: '2026-07-04T10:00:00Z',
  },
  {
    id: 'note_003',
    taskId: 'task_003',
    userId: 'user_003',
    type: 'handoff_note',
    content: 'Instagram takvimi bitti. LinkedIn ve görsel brief kaldı, öncelik LinkedIn.',
    createdAt: '2026-07-04T15:00:00Z',
  },
];

export const mockHandoffs: TaskHandoff[] = [
  {
    id: 'handoff_001',
    taskId: 'task_003',
    fromUserId: 'user_003',
    toUserId: 'user_004',
    currentStatus: 'in_progress',
    doneSoFar: 'Instagram içerik takvimi tamamlandı.',
    remainingWork: 'LinkedIn takvimi ve görsel brief hazırlanacak.',
    cautionNotes: 'LinkedIn tarafında B2B tonuna dikkat edilmeli.',
    newPriority: 'medium',
    newDueDate: '2026-07-08',
    acceptedStatus: 'accepted',
    createdAt: '2026-07-04T15:00:00Z',
    resolvedAt: '2026-07-04T15:20:00Z',
  },
];

export const mockDailySaves: DailySave[] = [
  {
    id: 'save_001',
    userId: 'user_001',
    workspaceId: 'workspace_001',
    date: '2026-07-04',
    completedTasks: 6,
    failedTasks: 1,
    postponedTasks: 2,
    successRate: 67,
    dailyNote: 'Bugün ana görevlerin çoğu tamamlandı fakat tasarım işi yarına kaldı.',
    createdAt: '2026-07-04T23:00:00Z',
  },
  {
    id: 'save_002',
    userId: 'user_001',
    workspaceId: 'workspace_001',
    date: '2026-07-03',
    completedTasks: 4,
    failedTasks: 0,
    postponedTasks: 1,
    successRate: 80,
    dailyNote: 'İyi bir gündü, spor da tamamlandı.',
    createdAt: '2026-07-03T22:30:00Z',
  },
];

export const motivationQuotes: MotivationContent[] = [
  { id: 'motivation_001', imageUrl: '', quote: 'Bugün küçük bir adım, yarın büyük bir sistem olur.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'motivation_002', imageUrl: '', quote: 'Yarım kalan işler değil, tamamlanan rutinler seni büyütür.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'motivation_003', imageUrl: '', quote: 'Disiplin, motivasyonun olmadığı günlerde başlar.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'motivation_004', imageUrl: '', quote: 'Bugün sadece başla. Devamı sistemin işi.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'motivation_005', imageUrl: '', quote: 'Bir işi bitirmek, zihinde yer açmaktır.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'motivation_006', imageUrl: '', quote: 'İlerlemek, mükemmel olmaktan daha değerlidir.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
  { id: 'motivation_007', imageUrl: '', quote: 'Kaldığın yeri bil, oradan devam et.', category: 'discipline', createdAt: '2026-06-01T09:00:00Z' },
];

export function pickDailyMotivation(): MotivationContent {
  const dayIndex = new Date().getDate() % motivationQuotes.length;
  return motivationQuotes[dayIndex];
}
