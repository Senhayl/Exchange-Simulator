import "./style.css";

const app = document.getElementById("app");

app.innerHTML = `
  <section class="page">
    <h1>Exchange Simulator</h1>
    <p>Frontend reconnecte avec succes.</p>
    <p>API health: <span id="health">verification...</span></p>
  </section>
`;

async function loadHealth() {
  const health = document.getElementById("health");
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("API indisponible");
    const data = await res.json();
    health.textContent = `ok (${data.timestamp})`;
  } catch (_error) {
    health.textContent = "non joignable";
  }
}

loadHealth();
