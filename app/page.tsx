export default function RootPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, fontFamily: "sans-serif", textAlign: "center", padding: 24 }}>
      <h1 style={{ fontSize: 24 }}>Cadeira Livre</h1>
      <p style={{ color: "#666" }}>Plataforma de agendamento para barbearias.</p>
      <p style={{ color: "#666", fontSize: 14 }}>
        Acesse uma barbearia específica em <code>/b/nome-da-barbearia</code>
      </p>
    </div>
  );
}
