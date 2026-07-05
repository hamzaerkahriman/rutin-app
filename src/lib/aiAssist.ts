import { supabase } from './supabase';

// Rutin — AI yardımcı özellikleri (ürün dokümanı §"v4 — Yapay Zeka Katmanı").
// Tüm çağrılar `ai-assist` Edge Function'ına gider — Anthropic API key'i
// client'a hiç ulaşmaz, fonksiyon içinde secret olarak durur.

async function invokeAiAssist<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai-assist', { body });
  if (error) throw new Error(error.message ?? 'AI isteği başarısız');
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function getAiTaskSummary(taskId: string): Promise<string> {
  const { summary } = await invokeAiAssist<{ summary: string }>({ mode: 'task_summary', taskId });
  return summary;
}

export interface AiHandoffDraft {
  doneSoFar: string;
  remainingWork: string;
  cautionNotes: string;
}

export async function getAiHandoffDraft(taskId: string): Promise<AiHandoffDraft> {
  return invokeAiAssist<AiHandoffDraft>({ mode: 'handoff_draft', taskId });
}

export async function getAiDailyComment(stats: {
  completedTasks: number;
  failedTasks: number;
  postponedTasks: number;
  successRate: number;
}): Promise<string> {
  const { comment } = await invokeAiAssist<{ comment: string }>({ mode: 'daily_comment', ...stats });
  return comment;
}
