export interface Exercise { id: number; type: string; }
export interface ProgressRecord { id: number; type: string; score: number; timeSpent: number; date: string; }
export interface UserNote { id: number; hint: string; tags: string[]; }
export interface UserProfile { id: string; name: string; isIncognito: boolean; }
export type SessionMode = 'smart' | 'random' | 'weakness' | 'simulation';

export interface CustomAPI {
    windowMin: () => void;
    windowMax: () => void;
    windowClose: () => void;
    getProfiles: () => Promise<UserProfile[]>;
    saveProfiles: (profiles: UserProfile[]) => Promise<UserProfile[]>;
    deleteData: (profileId: string) => Promise<boolean>;
    getProgress: (profileId: string) => Promise<ProgressRecord[]>;
    saveProgress: (profileId: string, record: ProgressRecord) => Promise<ProgressRecord[]>;
    getNotes: (profileId: string) => Promise<Record<number, UserNote>>;
    saveNote: (profileId: string, note: UserNote) => Promise<Record<number, UserNote>>;
    checkExercises: () => Promise<boolean>;
    importExercises: () => Promise<{success: boolean, error?: string}>;
}
declare global { interface Window { api: CustomAPI; } }