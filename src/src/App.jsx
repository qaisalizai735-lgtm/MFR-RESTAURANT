export default function App() {
  return (
    <div style={{ fontFamily: "Arial", padding: "20px" }}>
      
      <h1 style={{ color: "#ff4d4d" }}>🍔 MFR Restaurant</h1>
      <p>Delicious Fast Food | Juices | Ice Cream</p>

      <hr />

      <h2>🔥 Our Menu</h2>

      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>

        <div style={{ border: "1px solid #ccc", padding: "10px" }}>
          <h3>Burger</h3>
          <p>Rs 500</p>
          <button>Order</button>
        </div>

        <div style={{ border: "1px solid #ccc", padding: "10px" }}>
          <h3>Pizza</h3>
          <p>Rs 1200</p>
          <button>Order</button>
        </div>

        <div style={{ border: "1px solid #ccc", padding: "10px" }}>
          <h3>Juice</h3>
          <p>Rs 250</p>
          <button>Order</button>
        </div>

      </div>

    </div>
  );
}
