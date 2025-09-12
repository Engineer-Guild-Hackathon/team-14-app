import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Project {
  id: string;
  name: string;
  description?: string;
  path?: string;
  language?: string;
  createdAt: string;
  updatedAt: string;
}

export const useProject = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  const fetchProjects = async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would fetch from the backend
      // For now, return empty array to prevent build errors
      setProjects([]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (projectData: {
    name: string;
    description?: string;
    path?: string;
    language?: string;
  }) => {
    if (!isAuthenticated) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, this would create a project via API
      const newProject: Project = {
        id: Date.now().toString(),
        ...projectData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const selectProject = (project: Project) => {
    setActiveProject(project);
    // Store in localStorage for persistence
    localStorage.setItem('activeProject', JSON.stringify(project));
  };

  const deleteProject = async (projectId: string) => {
    if (!isAuthenticated) return false;
    
    setIsLoading(true);
    setError(null);
    
    try {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      if (activeProject?.id === projectId) {
        setActiveProject(null);
        localStorage.removeItem('activeProject');
      }
      
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAuthenticated) {
      fetchProjects();
      
      // Load active project from localStorage
      const savedProject = localStorage.getItem('activeProject');
      if (savedProject) {
        try {
          setActiveProject(JSON.parse(savedProject));
        } catch {
          localStorage.removeItem('activeProject');
        }
      }
    } else {
      setProjects([]);
      setActiveProject(null);
    }
  }, [user, isAuthenticated]);

  return {
    projects,
    activeProject,
    isLoading,
    error,
    refreshProjects: fetchProjects,
    createProject,
    openProject: selectProject,
    deleteProject,
  };
};;