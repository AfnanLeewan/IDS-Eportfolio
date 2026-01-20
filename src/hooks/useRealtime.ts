// Real-time subscriptions for live updates
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './useSupabaseData';
import { toast } from 'sonner';

/**
 * Subscribe to real-time score changes for a class
 */
export function useRealtimeScores(classId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled || !classId) return;
    
    const channel = supabase
      .channel(`scores-${classId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_scores',
        },
        (payload) => {
          console.log('Score change detected:', payload);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: queryKeys.classScores(classId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.classStats(classId) });
            
            // Show notification
            const action = payload.eventType === 'INSERT' ? 'เพิ่ม' : 'อัปเดต';
            toast.info(`มีการ${action}คะแนนใหม่`, {
              description: 'ข้อมูลได้รับการอัปเดตแล้ว',
              duration: 3000,
            });
          } else if (payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: queryKeys.classScores(classId) });
            toast.info('มีการลบคะแนน', {
              description: 'ข้อมูลได้รับการอัปเดตแล้ว',
              duration: 3000,
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, enabled, queryClient]);
}

/**
 * Subscribe to student changes
 */
export function useRealtimeStudents(enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled) return;
    
    const channel = supabase
      .channel('students-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        (payload) => {
          console.log('Student change detected:', payload);
          
          // Invalidate all student queries
          queryClient.invalidateQueries({ queryKey: queryKeys.students });
          
          if (payload.eventType === 'INSERT') {
            toast.success('มีนักเรียนใหม่เข้าระบบ');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('ข้อมูลนักเรียนได้รับการอัปเดต');
          } else if (payload.eventType === 'DELETE') {
            toast.info('มีการลบข้อมูลนักเรียน');
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

/**
 * Subscribe to class changes
 */
export function useRealtimeClasses(enabled: boolean = true) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled) return;
    
    const channel = supabase
      .channel('classes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
        },
        (payload) => {
          console.log('Class change detected:', payload);
          queryClient.invalidateQueries({ queryKey: queryKeys.classes });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}

/**
 * Subscribe to presence (who's online)
 */
export function usePresence(
  userId: string | undefined,
  userName: string | undefined,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled || !userId || !userName) return;
    
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Online users:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            user_name: userName,
            online_at: new Date().toISOString(),
          });
        }
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userName, enabled]);
}

/**
 * Hook to manage all real-time subscriptions
 */
export function useRealtimeSubscriptions(
  classId: string | null,
  userId: string | undefined,
  userName: string | undefined,
  options: {
    scores?: boolean;
    students?: boolean;
    classes?: boolean;
    presence?: boolean;
  } = {}
) {
  const {
    scores = true,
    students = true,
    classes = true,
    presence = false,
  } = options;
  
  useRealtimeScores(classId, scores);
  useRealtimeStudents(students);
  useRealtimeClasses(classes);
  usePresence(userId, userName, presence);
}
