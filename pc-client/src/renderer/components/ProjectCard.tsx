import React from 'react';

interface Project {
  id: string;
  name: string;
  description?: string;
  localPath?: string;  // Changed from 'path' to 'localPath' to match backend
  language?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProjectCardProps {
  project: Project;
  isActive?: boolean;
  onSelect?: (project: Project) => void;
  onDelete?: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  isActive = false,
  onSelect,
  onDelete,
}) => {
  const handleSelect = () => {
    onSelect?.(project);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${project.name}"?`)) {
      onDelete?.(project.id);
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
        isActive
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
      onClick={handleSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-gray-900 mb-1">
            {project.name}
          </h3>
          
          {project.description && (
            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
              {project.description}
            </p>
          )}
          
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            {project.language && (
              <span className="px-2 py-1 bg-gray-100 rounded">
                {project.language}
              </span>
            )}
            
            {project.localPath && (
              <span className="truncate max-w-xs" title={project.localPath}>
                📁 {project.localPath}
              </span>
            )}
          </div>
          
          <div className="mt-2 text-xs text-gray-400">
            Created: {new Date(project.createdAt).toLocaleDateString()}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {isActive && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
              Active
            </span>
          )}
          
          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};