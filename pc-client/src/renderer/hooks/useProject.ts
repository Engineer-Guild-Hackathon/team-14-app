import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

interface Project {
  id: string;
  name: string;
  description?: string;
  localPath?: string;  // Changed from "path" to "localPath" to match backend
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
    if (!isAuthenticated) {
      console.log('📋 [fetchProjects] Not authenticated, skipping fetch');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('📋 [fetchProjects] Starting to fetch projects from API...');
      const response = await window.electronAPI.api.request({
        method: 'GET',
        url: 'http://localhost:3000/api/projects'
      });
      
      console.log('📋 [fetchProjects] Raw response received:', response);
      console.log('📋 [fetchProjects] Response success:', response.success);
      console.log('📋 [fetchProjects] Response status:', response.status);
      console.log('📋 [fetchProjects] Response data:', response.data);
      console.log('📋 [fetchProjects] Full response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const projects = response.data.projects || response.data;
        console.log('📋 [fetchProjects] Extracted projects:', projects);
        console.log('📋 [fetchProjects] Projects type:', Array.isArray(projects) ? 'Array' : 'Not Array');
        console.log('📋 [fetchProjects] Projects length:', Array.isArray(projects) ? projects.length : 'N/A');
        
        const projectsToSet = Array.isArray(projects) ? projects : [];
        console.log('📋 [fetchProjects] Setting projects state to:', projectsToSet);
        setProjects(projectsToSet);
        console.log('📋 [fetchProjects] Projects state updated successfully');
      } else {
        console.warn('⚠️ [fetchProjects] No projects data in response or request failed');
        console.warn('⚠️ [fetchProjects] Response details:', {
          success: response.success,
          status: response.status,
          data: response.data,
          error: response.error
        });
        setProjects([]);
      }
    } catch (err: any) {
      console.error('❌ [fetchProjects] Exception occurred:', err);
      console.error('❌ [fetchProjects] Error message:', err.message);
      console.error('❌ [fetchProjects] Error stack:', err.stack);
      setError(err.message || 'Failed to fetch projects');
      // Don't overwrite existing projects on error
    } finally {
      setIsLoading(false);
      console.log('🏁 [fetchProjects] Fetch projects process finished');
    }
  };

  const createProject = async (projectData: {
    name: string;
    description?: string;
    localPath?: string;  // Changed from "path" to "localPath" to match backend
    language?: string;
  }) => {
    if (!isAuthenticated) return null;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🚀 [createProject] Starting project creation...', projectData);
      
      // Convert frontend field names to backend expected format
      const backendData = {
        name: projectData.name,
        description: projectData.description || '',
        localPath: projectData.localPath || '', // Now both use 'localPath'
        ...(projectData.language && { language: projectData.language })
      };
      console.log('🚀 [createProject] Sending to backend:', backendData);
      
      const response = await window.electronAPI.api.request({
        method: 'POST',
        url: 'http://localhost:3000/api/projects',
        data: backendData
      });
      
      console.log('🚀 [createProject] Raw response received:', response);
      console.log('🚀 [createProject] Response success:', response.success);
      console.log('🚀 [createProject] Response status:', response.status);
      console.log('🚀 [createProject] Response data:', response.data);
      console.log('🚀 [createProject] Response error:', response.error);
      console.log('🚀 [createProject] Full response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        const newProject = response.data.project || response.data;
        console.log('✅ [createProject] Extracted new project:', newProject);
        console.log('✅ [createProject] Current projects before adding:', projects.length);
        
        setProjects(prev => {
          console.log('✅ [createProject] Previous projects:', prev);
          const updated = [...prev, newProject];
          console.log('✅ [createProject] Updated projects list:', updated);
          return updated;
        });
        
        console.log('✅ [createProject] Project creation completed successfully');
        return newProject;
      } else {
        console.error('❌ [createProject] Create project failed - Response not successful');
        console.error('❌ [createProject] Response details:', {
          success: response.success,
          status: response.status,
          data: response.data,
          error: response.error
        });
        setError(response.data?.error?.message || response.error || 'Failed to create project');
        return null;
      }
    } catch (err: any) {
      console.error('❌ [createProject] Exception occurred:', err);
      console.error('❌ [createProject] Error message:', err.message);
      console.error('❌ [createProject] Error stack:', err.stack);
      setError(err.message || 'Failed to create project');
      return null;
    } finally {
      setIsLoading(false);
      console.log('🏁 [createProject] Project creation process finished');
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
      console.log('Deleting project via API...', projectId);
      
      const response = await window.electronAPI.api.request({
        method: 'DELETE',
        url: `http://localhost:3000/api/projects/${projectId}`
      });
      
      console.log('Delete project response:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // Only remove from local state if backend deletion was successful
        setProjects(prev => prev.filter(p => p.id !== projectId));
        
        if (activeProject?.id === projectId) {
          setActiveProject(null);
          localStorage.removeItem('activeProject');
        }
        
        return true;
      } else {
        console.error('Delete project failed:', JSON.stringify(response, null, 2));
        setError(response.data?.error?.message || response.error || 'Failed to delete project');
        return false;
      }
    } catch (err: any) {
      console.error('Delete project error:', err);
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
};