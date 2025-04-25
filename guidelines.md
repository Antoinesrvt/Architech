Guidelines de Développement: ArchiTech avec Tauri + Next.js
1. Vue d'ensemble actualisée
Architecture avec tauri-nextjs-template
 ┌─────────────────────────────────────────────────────┐
│                  ArchiTech (Tauri)                  │
│                                                     │
│  ┌─────────────────┐          ┌──────────────────┐  │
│  │                 │          │                  │  │
│  │  Next.js UI     │          │  Tauri/Rust      │  │
│  │  (React + SSG)  │◄────────►│  Backend         │  │
│  │                 │          │                  │  │
│  └─────────────────┘          └──────────────────┘  │
│           │                            │            │
│           ▼                            ▼            │
│  ┌─────────────────┐          ┌──────────────────┐  │
│  │                 │          │                  │  │
│  │  TailwindCSS +  │          │  Système de      │  │
│  │  shadcn/ui      │          │  Fichiers Local  │  │
│  │                 │          │                  │  │
│  └─────────────────┘          └──────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
 Avantages spécifiques au template
	•	Mode SSG (Static Site Generation) de Next.js pour une application desktop rapide 	•	TailwindCSS déjà configuré avec le design system 	•	TypeScript intégré avec configuration stricte 	•	GitHub Actions préconfigurées pour build multi-plateforme 	•	Système de linting opinionné
2. Structure de projet adaptée
 architech/
├── next.config.js              # Configuration Next.js (mode SSG requis)
├── tailwind.config.js          # Configuration TailwindCSS
├── tsconfig.json               # Configuration TypeScript
│
├── src/                        # Code Next.js (frontend)
│   ├── components/             # Composants React
│   │   ├── ui/                 # Composants UI (shadcn/ui)
│   │   ├── wizard/             # Assistants de génération
│   │   ├── project/            # Gestion de projets
│   │   └── layouts/            # Mises en page
│   │
│   ├── lib/                    # Logique applicative
│   │   ├── store/              # État global (Zustand)
│   │   │   ├── project-store.ts   # État des projets
│   │   │   ├── template-store.ts  # État des templates
│   │   │   └── settings-store.ts  # Préférences utilisateur
│   │   │
│   │   ├── api/                # Couche d'abstraction API
│   │   │   ├── types.ts           # Types partagés
│   │   │   ├── local.ts           # Implémentation locale
│   │   │   └── index.ts           # Factory d'API
│   │   │
│   │   ├── templates/          # Définitions des templates
│   │   ├── modules/            # Définitions des modules
│   │   └── utils/              # Utilitaires
│   │
│   ├── pages/                  # Pages Next.js
│   │   ├── index.tsx           # Dashboard principal
│   │   ├── new-project.tsx     # Création de projet
│   │   ├── settings.tsx        # Paramètres
│   │   └── templates.tsx       # Explorateur de templates
│   │
│   ├── styles/                 # Styles globaux
│   │   └── globals.css         # CSS global (avec Tailwind)
│   │
│   └── types/                  # Types TypeScript
│
├── src-tauri/                  # Code Rust
│   ├── Cargo.toml              # Configuration Rust
│   ├── tauri.conf.json         # Configuration Tauri
│   └── src/
│       ├── main.rs             # Point d'entrée Rust
│       ├── commands/           # Commandes Tauri
│       │   ├── project.rs      # Commandes de gestion de projets
│       │   ├── template.rs     # Commandes de gestion de templates
│       │   └── system.rs       # Commandes système
│       │
│       └── utils/              # Utilitaires Rust
│
├── public/                     # Assets statiques
│   ├── icons/                  # Icônes d'application
│   └── templates-registry/     # Registre local des templates
│
└── templates/                  # Templates et modules
    ├── nextjs/                 # Templates Next.js
    │   ├── base/               # Template de base
    │   ├── saas/               # Template SaaS
    │   └── dashboard/          # Template dashboard
    │
    └── modules/                # Modules d'extension
        ├── tailwind/           # Module Tailwind
        ├── i18n/               # Module i18n
        └── state/              # Module state management
 3. Configuration spécifique au template
Next.js en mode SSG
Configurer ⁠next.config.js pour une utilisation optimale avec Tauri:
 // next.config.js
const nextConfig = {
  // Mode statique requis pour Tauri
  output: 'export',
  
  // Optimisations pour Tauri
  images: {
    unoptimized: true,
  },
  
  // Désactiver les features serveur inutiles
  experimental: {
    // Configurations supplémentaires pour optimiser la build
  },
  
  // Pour le bundle SSG Tauri
  trailingSlash: true,
};

module.exports = nextConfig;
 Configuration Tauri
Ajuster la configuration dans ⁠src-tauri/tauri.conf.json:
 {
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../out"
  },
  "bundle": {
    "active": true,
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "identifier": "com.architech.dev",
    "targets": ["deb", "msi", "dmg", "updater"]
  }
}
 Optimisation des permissions
Configurer les permissions Tauri nécessaires:
 {
  "tauri": {
    "allowlist": {
      "fs": {
        "all": true,
        "scope": ["$APPDATA/*", "$APPDATA/../**"]
      },
      "shell": {
        "all": true,
        "execute": true,
        "sidecar": true,
        "open": true,
        "scope": [
          { "name": "npm", "cmd": "npm", "args": true },
          { "name": "npx", "cmd": "npx", "args": true },
          { "name": "yarn", "cmd": "yarn", "args": true },
          { "name": "code", "cmd": "code", "args": true }
        ]
      },
      "dialog": {
        "all": true
      },
      "path": {
        "all": true
      }
    }
  }
}
 4. Flux de développement optimisé
Cycle de développement
	1.	Développement UI (Next.js)
 # Dans le répertoire principal
npm run dev
 Cela lancera Next.js en mode développement sur localhost:3000 	2.	Développement Tauri (avec UI)
 # Dans le répertoire principal
npm run tauri dev
 Cela lancera l'application Tauri avec l'UI Next.js intégrée 	3.	Tests
 # Tests React
npm run test

# Tests Tauri/Rust
cd src-tauri && cargo test
 
Bonnes pratiques de commits
	•	Utiliser le format conventionnel: ⁠type(scope): message
	▪	⁠feat: pour les nouvelles fonctionnalités 	▪	⁠fix: pour les corrections de bugs 	▪	⁠chore: pour la maintenance 	▪	⁠docs: pour la documentation 	▪	⁠refactor: pour les refactorisations 	▪	⁠test: pour les ajouts/modifications de tests 	•	Créer des branches par fonctionnalité:
	▪	⁠feature/wizard-ui 	▪	⁠feature/template-generation
5. Implémentation des fonctionnalités clés
1. Communication React ↔ Rust
Établir une communication bidirectionnelle entre Next.js et Rust:
 // src/lib/api/local.ts
import { invoke } from '@tauri-apps/api/tauri';
import { TemplateService, Template, Module, ProjectConfig } from './types';

export class LocalTemplateService implements TemplateService {
  async getTemplates(): Promise<Template[]> {
    return await invoke('get_templates');
  }

  async getModules(): Promise<Module[]> {
    return await invoke('get_modules');
  }

  async generateProject(config: ProjectConfig): Promise<string> {
    return await invoke('generate_project', { config });
  }
}
 Côté Rust:
 // src-tauri/src/commands/template.rs
use tauri::command;
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Template {
    id: String,
    name: String,
    description: String,
}

#[command]
pub fn get_templates() -> Vec<Template> {
    // Implémenter la logique de récupération des templates
}
 2. Intégration de shadcn/ui avec Next.js + Tailwind
 # Initialiser shadcn/ui
npx shadcn-ui@latest init

# Ajouter les composants nécessaires
npx shadcn-ui@latest add button card tabs select dialog
 3. État global avec Zustand
 // src/lib/store/project-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProjectState {
  recentProjects: RecentProject[];
  addProject: (project: RecentProject) => void;
  removeProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      recentProjects: [],
      addProject: (project) => set((state) => ({ 
        recentProjects: [project, ...state.recentProjects].slice(0, 10) 
      })),
      removeProject: (projectId) => set((state) => ({
        recentProjects: state.recentProjects.filter(p => p.id !== projectId)
      })),
    }),
    {
      name: 'architech-projects',
    }
  )
);
 6. Plan de développement itératif
Sprint 1: Fondation et infrastructure (1 semaine)
	•	Setup du projet avec tauri-nextjs-template 	•	Configuration de shadcn/ui 	•	Mise en place de Zustand pour la gestion d'état 	•	Définition des types et interfaces principaux 	•	Implémentation des commandes Tauri de base
Sprint 2: Interface utilisateur principale (1 semaine)
	•	Création du dashboard principal 	•	Mise en place de la navigation 	•	Développement de l'UI des paramètres 	•	Création des composants réutilisables
Sprint 3: Wizard de création de projet (1.5 semaine)
	•	Développement du formulaire multi-étapes 	•	Intégration avec l'état global 	•	Visualisation des options sélectionnées 	•	Validation des entrées utilisateur
Sprint 4: Génération de projets (1.5 semaine)
	•	Implémentation des commandes Rust pour la génération 	•	Intégration avec create-next-app 	•	Système de gestion des modules 	•	Gestion des fichiers et transformations
Sprint 5: Templates et modules (1 semaine)
	•	Création des templates de base 	•	Implémentation des modules principaux (Tailwind, i18n, state) 	•	Interface d'exploration des templates 	•	Système de configuration des modules
Sprint 6: Tests et finalisation (1 semaine)
	•	Tests d'intégration complets 	•	Corrections de bugs 	•	Optimisation des performances 	•	Documentation utilisateur 	•	Préparation de la démo
7. Spécifications techniques détaillées
Interface de génération de projet
Définition complète de l'interface entre Next.js et Rust:
 // src/lib/api/types.ts
export interface ProjectConfig {
  name: string;
  path: string;
  template: string;
  modules: ModuleConfig[];
  options: {
    typescript: boolean;
    appRouter: boolean;
    eslint: boolean;
  };
}

export interface ModuleConfig {
  id: string;
  options: Record<string, any>;
}

export interface GenerationProgress {
  step: string;
  message: string;
  progress: number;
}

export interface TemplateService {
  getTemplates(): Promise<Template[]>;
  getModules(): Promise<Module[]>;
  validateProjectConfig(config: ProjectConfig): Promise<ValidationResult>;
  generateProject(config: ProjectConfig): Promise<string>;
  listenToProgress(callback: (progress: GenerationProgress) => void): () => void;
}
 Structure des templates et modules
Définir la structure standardisée pour les templates et modules:
 // src/lib/templates/types.ts
export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  screenshot?: string;
  baseCommand: string;
  recommendedModules: string[];
  structure: {
    enforced: boolean;
    directories: string[];
  };
}

// src/lib/modules/types.ts
export interface Module {
  id: string;
  name: string;
  description: string;
  version: string;
  category: 'styling' | 'state' | 'i18n' | 'testing' | 'ui' | 'forms' | 'advanced';
  dependencies: string[];
  incompatibleWith: string[];
  installation: {
    commands: string[];
    files: FileOperation[];
    transforms: Transform[];
  };
  configuration: {
    options: ModuleOption[];
  };
}
 8. Workflow de génération Next.js
Étapes précises de génération
	1.	Préparation:
	▪	Validation des entrées 	▪	Vérification des prérequis système 	▪	Création du répertoire de destination 	2.	Création du projet de base:
	▪	Exécution de ⁠create-next-app avec les options sélectionnées 	▪	Attente de la fin du processus 	▪	Vérification du succès 	3.	Application des modules:
	▪	Pour chaque module sélectionné:
	◦	Installation des dépendances 	◦	Copie des fichiers 	◦	Application des transformations 	◦	Exécution des commandes post-installation 	4.	Finalisation:
	▪	Nettoyage des fichiers temporaires 	▪	Génération du README spécifique 	▪	Initialisation du dépôt Git (optionnel)
Exemple d'implémentation Rust
 // src-tauri/src/commands/project.rs
#[command]
pub async fn generate_project(config: ProjectConfig) -> Result<String, String> {
    // 1. Préparation
    let project_path = prepare_project_directory(&config)?;
    
    // 2. Création du projet de base
    create_base_project(&config, &project_path).await?;
    
    // 3. Application des modules
    for module_config in &config.modules {
        apply_module(&module_config, &project_path).await?;
    }
    
    // 4. Finalisation
    finalize_project(&config, &project_path).await?;
    
    Ok(project_path)
}
 9. Considérations UX pour l'application Tauri/Next.js
Navigation optimisée pour desktop
Utiliser une navigation adaptée aux applications desktop:
 // src/components/layouts/MainLayout.tsx
import { Sidebar } from '../ui/sidebar';
import { TopBar } from '../ui/top-bar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <TopBar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
 Gestion du chargement et des erreurs
 // src/components/ui/command-feedback.tsx
import { useState, useEffect } from 'react';
import { Progress } from './progress';
import { Alert, AlertTitle, AlertDescription } from './alert';

export function CommandFeedback({ 
  status, 
  progress, 
  message, 
  error 
}: CommandFeedbackProps) {
  return (
    <div className="mt-4">
      {status === 'loading' && (
        <div className="space-y-2">
          <p className="text-sm">{message}</p>
          <Progress value={progress} />
        </div>
      )}
      
      {status === 'error' && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {status === 'success' && (
        <Alert variant="success">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
 10. Stratégie de tests
Tests React avec Next.js
 // src/components/ui/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './button';

describe('Button component', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
 Tests de commandes Tauri
 // src-tauri/src/commands/project_test.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    
    #[test]
    fn test_prepare_project_directory() {
        let temp = tempdir().unwrap();
        let config = ProjectConfig {
            name: "test-project".to_string(),
            path: temp.path().to_str().unwrap().to_string(),
            // ... autres champs
        };
        
        let result = prepare_project_directory(&config);
        assert!(result.is_ok());
    }
}
 