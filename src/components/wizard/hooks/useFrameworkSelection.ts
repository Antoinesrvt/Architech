import { useState, useEffect } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { useProjectStore } from '@/lib/store/project-store';
import { frameworkService } from '@/lib/api';

export function useFrameworkSelection() {
  const { frameworks, setFrameworks } = useFrameworkStore();
  const { selectedFrameworkId, setSelectedFramework, saveDraft } = useProjectStore();
  const [selectedType, setSelectedType] = useState<string>('web');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Update selected type based on selected framework
  useEffect(() => {
    if (selectedFramework) {
      setSelectedType(selectedFramework.type);
    }
  }, [selectedFramework]);

  // Filter frameworks by type
  const frameworksByType = frameworks.filter(framework => framework.type === selectedType);

  // Load frameworks
  const loadFrameworks = async () => {
    if (frameworks.length > 0) return;

    setLoading(true);
    setError(null);

    try {
      const loadedFrameworks = await frameworkService.getFrameworks();
      await setFrameworks(loadedFrameworks);
    } catch (err) {
      setError('Failed to load frameworks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadFrameworks();
  }, []);

  // Select a framework
  const selectFramework = async (frameworkId: string) => {
    try {
      await setSelectedFramework(frameworkId);
      // Draft is automatically saved by the setSelectedFramework method
    } catch (error) {
      console.error('Failed to select framework:', error);
    }
  };

  return {
    frameworks,
    frameworksByType,
    selectedFramework,
    selectedFrameworkId,
    selectedType,
    loading,
    error,
    setSelectedType,
    selectFramework,
    loadFrameworks,
  };
}