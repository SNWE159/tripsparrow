export default function Home() {
  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>🌍 Welcome to TripSparrow</h1>
      <p>Your AI-powered travel guide</p>
      <button
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
        onClick={() => alert("🚀 Trip Planning Coming Soon!")}
      >
        Start Your Trip
      </button>
    </div>
  );
}
