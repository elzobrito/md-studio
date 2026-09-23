import React, { useEffect, useState } from 'react';
import type { PresentationModel } from './types';
import { processPresentation } from './processor';
import { PresentationStage } from './PresentationStage';
import { requestPresentationFullscreen, exitPresentationFullscreen } from './presentation-session';
import './presentation.css';

export interface PresentationModeProps {
  isOpen: boolean;
  content: string;
  activePath?: string | null;
  appTheme?: 'auto' | 'light' | 'dark';
  onClose: () => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({
  isOpen,
  content,
  activePath,
  appTheme = 'auto',
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<PresentationModel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setModel(null);
      setError(null);
      setLoading(true);
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    // Tenta fullscreen sem bloquear caso negado
    void requestPresentationFullscreen();

    const compile = async () => {
      try {
        const presentationModel = await processPresentation({
          documentId: activePath || 'untitled.md',
          markdown: content,
          workspaceRoot: null,
          relativePath: activePath || null,
        });

        if (isSubscribed) {
          setModel(presentationModel);
          setLoading(false);
        }
      } catch (err) {
        if (isSubscribed) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setLoading(false);
        }
      }
    };

    void compile();

    return () => {
      isSubscribed = false;
      void exitPresentationFullscreen();
    };
  }, [isOpen, content, activePath]);

  if (!isOpen) {
    return null;
  }

  if (loading) {
    return (
      <div
        className={`md-presentation-overlay theme-${appTheme} md-presentation-loading`}
        role="status"
        aria-live="polite"
      >
        <div className="md-presentation-loading-box">
          <div className="md-presentation-spinner" />
          <p>Preparando apresentação…</p>
        </div>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div
        className={`md-presentation-overlay theme-${appTheme} md-presentation-error-screen`}
        role="alert"
      >
        <div className="md-presentation-error-card">
          <h2>Falha ao carregar apresentação</h2>
          <p>{error || 'Não foi possível compilar os slides.'}</p>
          <button
            type="button"
            className="md-presentation-back-btn"
            onClick={onClose}
          >
            Voltar ao Editor (Esc)
          </button>
        </div>
      </div>
    );
  }

  if (model.slides.length === 0) {
    return (
      <div
        className={`md-presentation-overlay theme-${appTheme} md-presentation-empty-screen`}
        role="region"
        aria-label="Apresentação vazia"
      >
        <button
          type="button"
          className="md-presentation-exit-btn"
          onClick={onClose}
          aria-label="Sair da apresentação"
        >
          ✕ Sair (F5 / Esc)
        </button>
        <div className="md-presentation-empty-card">
          <div className="md-presentation-empty-icon">📄</div>
          <h2>Documento Vazio</h2>
          <p>Este documento não possui conteúdo para apresentação.</p>
          <button
            type="button"
            className="md-presentation-back-btn"
            onClick={onClose}
          >
            Voltar ao Editor (Esc)
          </button>
        </div>
      </div>
    );
  }

  return (
    <PresentationStage
      model={model}
      appTheme={appTheme}
      onExit={onClose}
    />
  );
};
