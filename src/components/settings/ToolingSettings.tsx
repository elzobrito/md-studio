import React, { useEffect, useState } from "react";
import {
  getFormatterCapabilitiesSnapshot,
  type FormatterCapabilitiesSnapshot,
  type FormatterCapability,
} from "../../services/formatter/capabilities";

export function ToolingSettings() {
  const [snapshot, setSnapshot] = useState<FormatterCapabilitiesSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCapabilities = async (probeCli = true) => {
    setIsLoading(true);
    setError(null);
    try {
      const snap = await getFormatterCapabilitiesSnapshot({ probeCli });
      setSnapshot(snap);
    } catch (err: any) {
      setError(err?.message || "Falha ao consultar formatadores locais");
    } finally {
      setIsLoading(false);
    }
  };

  // Carregamento lazy e assíncrono ao montar a seção
  useEffect(() => {
    let alive = true;
    void loadCapabilities().then(() => {
      if (!alive) return;
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="tooling-settings" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#cdd6f4", margin: 0 }}>
            Formatadores e Ferramentas Locais
          </h3>
          <p style={{ fontSize: "12px", color: "#a6adc8", margin: "4px 0 0 0" }}>
            Ferramentas detectadas no ambiente local para formatação de blocos de código.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadCapabilities(true)}
          disabled={isLoading}
          style={{
            background: "#313244",
            color: "#cdd6f4",
            border: "1px solid #45475a",
            borderRadius: "4px",
            padding: "6px 12px",
            fontSize: "12px",
            cursor: isLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {isLoading ? "Verificando..." : "Atualizar (Discovery)"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "#f38ba8",
            color: "#11111b",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {isLoading && !snapshot && (
        <div style={{ padding: "24px", textAlign: "center", color: "#6c7086", fontSize: "13px" }}>
          Consultando ferramentas locais...
        </div>
      )}

      {snapshot && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ fontSize: "12px", color: "#a6adc8" }}>
            Total de {snapshot.formatters.length} formatador(es) mapeado(s). Ferramentas ausentes não bloqueiam o editor.
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "380px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {snapshot.formatters.map((f: FormatterCapability) => (
              <div
                key={f.id}
                style={{
                  background: "#181825",
                  border: "1px solid #313244",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "#cdd6f4" }}>
                      {f.name}
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: f.runtime === "web" ? "#89b4fa" : "#cba6f7",
                        color: "#11111b",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {f.runtime}
                    </span>
                    {f.binary && (
                      <span style={{ fontSize: "11px", color: "#6c7086", fontFamily: "monospace" }}>
                        bin: {f.binary}
                      </span>
                    )}
                  </div>

                  {f.description && (
                    <div style={{ fontSize: "12px", color: "#a6adc8" }}>{f.description}</div>
                  )}

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                    {f.languages.map((lang) => (
                      <span
                        key={lang}
                        style={{
                          fontSize: "10px",
                          fontFamily: "monospace",
                          background: "#313244",
                          color: "#bac2de",
                          padding: "1px 5px",
                          borderRadius: "3px",
                        }}
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: "right", minWidth: "100px" }}>
                  {f.available ? (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#a6e3a1",
                        color: "#11111b",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                      }}
                    >
                      Disponível
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#45475a",
                        color: "#a6adc8",
                        padding: "3px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 500,
                      }}
                    >
                      Indisponível
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
