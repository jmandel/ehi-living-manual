import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  code: string;
  id: string;
}

export default function MermaidDiagram({ code, id }: MermaidDiagramProps) {
  const [activeTab, setActiveTab] = useState<'diagram' | 'code'>('diagram');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab !== 'diagram' || !containerRef.current) return;

    let mounted = true;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'strict'
        });

        // Decode any HTML entities that might have been escaped
        const decodedCode = code
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        const { svg } = await mermaid.render(`mermaid-${id}`, decodedCode);
        
        if (mounted && containerRef.current) {
          // Create a new div to hold the SVG
          const svgContainer = document.createElement('div');
          svgContainer.innerHTML = svg;
          
          // Clear the container and append the SVG element
          containerRef.current.innerHTML = '';
          if (svgContainer.firstChild) {
            containerRef.current.appendChild(svgContainer.firstChild);
          }
        }
      } catch (err) {
        if (mounted) {
          console.error('Mermaid rendering error:', err);
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      mounted = false;
    };
  }, [code, id, activeTab]);

  return (
    <div className="mermaid-wrapper">
      <div className="mermaid-tabs">
        <button
          className={`mermaid-tab ${activeTab === 'diagram' ? 'active' : ''}`}
          onClick={() => setActiveTab('diagram')}
        >
          Diagram
        </button>
        <button
          className={`mermaid-tab ${activeTab === 'code' ? 'active' : ''}`}
          onClick={() => setActiveTab('code')}
        >
          Code
        </button>
      </div>

      <div className="mermaid-content">
        {activeTab === 'diagram' ? (
          <div className="mermaid-container">
            {isLoading && (
              <div className="mermaid-loading">Loading diagram...</div>
            )}
            {error && (
              <div className="mermaid-error">
                Error rendering diagram: {error}
              </div>
            )}
            <div 
              ref={containerRef} 
              className="mermaid-svg-container"
              style={{ display: isLoading || error ? 'none' : 'block' }}
            />
          </div>
        ) : (
          <pre className="mermaid-code">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}