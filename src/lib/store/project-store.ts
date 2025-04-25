import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentProject {
  id: string;
  name: string;
  path: string;
  template: string;
  createdAt: string;
  lastOpenedAt: string;
}

interface ProjectState {
  recentProjects: RecentProject[];
  addProject: (project: RecentProject) => void;
  removeProject: (projectId: string) => void;
  updateLastOpened: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      recentProjects: [],
      addProject: (project) => set((state) => ({ 
        recentProjects: [project, ...state.recentProjects.filter(p => p.id !== project.id)].slice(0, 10) 
      })),
      removeProject: (projectId) => set((state) => ({
        recentProjects: state.recentProjects.filter(p => p.id !== projectId)
      })),
      updateLastOpened: (projectId) => set((state) => ({
        recentProjects: state.recentProjects.map(p => 
          p.id === projectId 
            ? { ...p, lastOpenedAt: new Date().toISOString() } 
            : p
        )
      })),
    }),
    {
      name: 'architech-projects',
    }
  )
); 