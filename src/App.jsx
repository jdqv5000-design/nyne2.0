import React, { useEffect, useMemo, useState } from "react";

/** Claves de almacenamiento */
const LS_INSUMOS = "inventario_insumos_v2";
const LS_PRODUCTOS = "inventario_productos_v2";
const LS_VENTAS = "inventario_ventas_v1";

/** Utilidades */
const uid = () => Math.random().toString(36).slice(2, 9);
const currency = new Intl.NumberFormat("es-EC", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const toNum = (v) => (Number.isNaN(parseFloat(v)) ? 0 : parseFloat(v));
const todayISO = () => new Date().toISOString().slice(0, 10);
const ym = (dIso) => (dIso || "").slice(0, 7); // YYYY-MM
const pad2 = (n) => String(n).padStart(2, "0");

/** Colores predefinidos (más intensos) */
const PRESET_COLORS = ["#FFCDD2", "#FFF59D", "#B2EBF2"]; // rojo claro, amarillo claro, cian claro
const ALPHA = "55"; // ~33% opacidad para sombreado más intenso

/* ---------- Componente Badge para el resumen ---------- */
const Badge = ({ title, value }) => (
  <div
    style={{
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: "10px 12px",
      minWidth: 160,
      background: "#fafafa",
    }}
  >
    <div style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
  </div>
);

/* Estilos utilitarios */
const tabBtn = (active) => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ddd",
  background: active ? "#111" : "#fff",
  color: active ? "#fff" : "#111",
  cursor: "pointer",
});
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.3)",
  display: "grid",
  placeItems: "center",
  padding: 12,
};
const modal = {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  border: "1px solid #ddd",
  width: "min(720px, 100%)",
};

/* Helpers CSV */
function csvEscape(s) {
  const str = String(s ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export default function App() {
  const [tab, setTab] = useState("insumos");

  /** -------------------- INSUMOS -------------------- */
  const [insumos, setInsumos] = useState(() => {
    const guardado = localStorage.getItem(LS_INSUMOS);
    const arr = guardado ? JSON.parse(guardado) : [];
    return arr.map((i) => ({ ...i, id: String(i.id) })); // ids como string
  });
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");

  useEffect(() => {
    localStorage.setItem(LS_INSUMOS, JSON.stringify(insumos));
  }, [insumos]);

  const agregarInsumo = () => {
    if (!nombre || cantidad === "" || precio === "") {
      alert("Completa nombre, cantidad y precio");
      return;
    }
    const cant = parseFloat(cantidad);
    theprec = parseFloat(precio);
    if (Number.isNaN(cant) || Number.isNaN(theprec)) {
      alert("Cantidad y precio deben ser números");
      return;
    }
    const nuevo = {
      id: String(uid()),
      nombre,
      cantidad: cant,
      precio: theprec,
    };
    setInsumos((xs) => [...xs, nuevo]);
    setNombre("");
    setCantidad("");
    setPrecio("");
  };

  const eliminarInsumo = (id) => {
    setInsumos((xs) => xs.filter((i) => i.id !== id));
  };

  const editarInsumo = (id, campo, valor) => {
    setInsumos((xs) =>
      xs.map((i) =>
        i.id === id ? { ...i, [campo]: parseFloat(valor) || 0 } : i
      )
    );
  };

  const totalInsumos = insumos.reduce(
    (acc, i) => acc + i.cantidad * i.precio,
    0
  );

  /** Mapa de insumos por id */
  const insumoById = useMemo(() => {
    const m = new Map();
    insumos.forEach((i) => m.set(String(i.id), i));
    return m;
  }, [insumos]);

  /** -------------------- PRODUCTOS -------------------- */
  // producto: { id, nombre, precioVenta, ganancia, receta: [{insumoId, cantidad}] }
  const [productos, setProductos] = useState(() => {
    const raw = localStorage.getItem(LS_PRODUCTOS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.map((p) => ({
      ...p,
      id: String(p.id || uid()),
      receta: (p.receta || []).map((r) => ({
        ...r,
        insumoId: String(r.insumoId),
      })),
    }));
  });

  useEffect(() => {
    localStorage.setItem(LS_PRODUCTOS, JSON.stringify(productos));
  }, [productos]);

  const costoDeReceta = (receta) =>
    (receta || []).reduce((acc, r) => {
      const ins = insumoById.get(String(r.insumoId));
      const cant = parseFloat(r.cantidad) || 0;
      const precio = ins ? Number(ins.precio) : 0;
      return acc + cant * precio;
    }, 0);

  // --- Modal de Producto (crear/editar) ---
  const [pModalOpen, setPModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [draft, setDraft] = useState({
    nombre: "",
    precioVenta: "",
    ganancia: "", // USD
    receta: [],
  });
  const costoDraft = useMemo(
    () => costoDeReceta(draft.receta),
    [draft, insumoById]
  );

  const abrirNuevoProducto = () => {
    setEditId(null);
    setDraft({ nombre: "", precioVenta: "", ganancia: "", receta: [] });
    setPModalOpen(true);
  };
  const abrirEditarProducto = (prod) => {
    setEditId(prod.id);
    setDraft({
      nombre: prod.nombre,
      precioVenta: prod.precioVenta ?? "",
      ganancia: prod.ganancia ?? "",
      receta: (prod.receta || []).map((r) => ({
        ...r,
        insumoId: String(r.insumoId),
      })),
    });
    setPModalOpen(true);
  };
  const guardarProducto = (e) => {
    e.preventDefault();
    if (!draft.nombre?.trim()) return alert("Pon un nombre para el producto");

    const precioVentaNum =
      draft.precioVenta === "" ? "" : parseFloat(draft.precioVenta);
    const gananciaNum = draft.ganancia === "" ? "" : parseFloat(draft.ganancia);

    const costo = costoDeReceta(draft.receta);
    const precioCalculado =
      draft.precioVenta === "" && !Number.isNaN(gananciaNum)
        ? +(costo + (Number.isNaN(gananciaNum) ? 0 : gananciaNum)).toFixed(2)
        : Number.isNaN(precioVentaNum)
        ? ""
        : precioVentaNum;

    const clean = {
      id: editId || String(uid()),
      nombre: draft.nombre.trim(),
      precioVenta: precioCalculado,
      ganancia: Number.isNaN(gananciaNum) ? "" : gananciaNum,
      receta:
        draft.receta?.filter((r) => r.insumoId && r.cantidad !== "") || [],
    };

    if (editId)
      setProductos((xs) =>
        xs.map((p) => (p.id === editId ? { ...p, ...clean } : p))
      );
    else setProductos((xs) => [clean, ...xs]);

    setPModalOpen(false);
  };
  const eliminarProducto = (id) => {
    if (!confirm("¿Eliminar este producto?")) return;
    setProductos((xs) => xs.filter((p) => p.id !== id));
  };
  const costoProducto = (p) => costoDeReceta(p.receta || []);
  const productoPorId = (id) =>
    productos.find((p) => String(p.id) === String(id));

  /** -------------------- VENTAS -------------------- */
  // venta: { id, productId, qty, place, dateISO, name, hora, color, obs }
  const [ventas, setVentas] = useState(() => {
    const raw = localStorage.getItem(LS_VENTAS);
    const arr = raw ? JSON.parse(raw) : [];
    return arr.map((v) => ({
      id: String(v.id || uid()),
      productId: String(v.productId),
      qty: toNum(v.qty),
      place: v.place || "",
      dateISO: v.dateISO || todayISO(),
      name: v.name || "",
      hora: v.hora || "", // HH:MM
      color: v.color || "", // color editable en tabla
      obs: v.obs || "", // observaciones
    }));
  });
  const [mes, setMes] = useState(ym(todayISO())); // YYYY-MM

  useEffect(() => {
    localStorage.setItem(LS_VENTAS, JSON.stringify(ventas));
  }, [ventas]);

  // Formulario de alta rápida (sin color ni obs; ambos se editan luego en tabla)
  const [ventaDraft, setVentaDraft] = useState({
    productId: "",
    qty: "",
    name: "",
    place: "",
    dateISO: todayISO(),
    hora: "",
  });

  // asegura que fecha del formulario esté dentro del mes seleccionado
  useEffect(() => {
    if (ym(ventaDraft.dateISO) !== mes) {
      const firstDay = mes + "-01";
      setVentaDraft((d) => ({ ...d, dateISO: firstDay }));
    }
  }, [mes]); // eslint-disable-line

  const costoUnitDeProducto = (productId) => {
    const p = productoPorId(productId);
    return p ? costoProducto(p) : 0;
  };
  const gananciaBaseDeProducto = (productId) => {
    const p = productoPorId(productId);
    return p ? toNum(p.ganancia) : 0;
  };

  // Descuenta insumos según receta * cantidad (permite negativos)
  const descontarInsumosPorVenta = (productId, qty) => {
    const p = productoPorId(productId);
    if (!p || !p.receta?.length) return;
    setInsumos((xs) =>
      xs.map((ins) => {
        const r = p.receta.find((ri) => String(ri.insumoId) === String(ins.id));
        if (!r) return ins;
        const delta = toNum(r.cantidad) * toNum(qty);
        return { ...ins, cantidad: ins.cantidad - delta };
      })
    );
  };

  // Repone insumos (inverso de descontar)
  const reponerInsumosPorVenta = (venta) => {
    const p = productoPorId(venta.productId);
    if (!p || !p.receta?.length) return;
    setInsumos((xs) =>
      xs.map((ins) => {
        const r = p.receta.find((ri) => String(ri.insumoId) === String(ins.id));
        if (!r) return ins;
        const delta = toNum(r.cantidad) * toNum(venta.qty);
        return { ...ins, cantidad: ins.cantidad + delta };
      })
    );
  };

  const agregarVenta = () => {
    if (!ventaDraft.productId) return alert("Elige un producto");
    if (ventaDraft.qty === "") return alert("Pon cantidad");
    const qty = toNum(ventaDraft.qty);
    if (qty <= 0) return alert("Cantidad debe ser > 0");
    if (!ventaDraft.dateISO || ym(ventaDraft.dateISO) !== mes)
      return alert("Fecha fuera del mes seleccionado");

    const hora = ventaDraft.hora
      ? ventaDraft.hora.split(":").slice(0, 2).map(pad2).join(":")
      : "";

    const nueva = {
      id: String(uid()),
      productId: String(ventaDraft.productId),
      qty,
      place: ventaDraft.place.trim(),
      name: ventaDraft.name.trim(),
      dateISO: ventaDraft.dateISO,
      hora, // inicia con hora opcional
      color: "", // inicia sin color
      obs: "", // inicia sin observaciones
    };
    setVentas((xs) => [nueva, ...xs]);
    descontarInsumosPorVenta(nueva.productId, qty);

    // limpiar algunos campos del formulario
    setVentaDraft((d) => ({
      ...d,
      qty: "",
      place: "",
      name: "",
      hora: "",
    }));
  };

  const eliminarVenta = (id) => {
    // Mantengo: NO repone insumos al borrar manualmente
    if (!confirm("¿Eliminar esta venta? (no repone insumos)")) return;
    setVentas((xs) => xs.filter((v) => v.id !== id));
  };

  // Ventas filtradas por mes y ordenadas por fecha + hora (asc)
  const ventasMes = [...ventas]
    .filter((v) => ym(v.dateISO) === mes)
    .sort((a, b) => {
      const d = a.dateISO.localeCompare(b.dateISO);
      if (d !== 0) return d;
      const ha = a.hora || "99:99"; // vacío al final del día
      const hb = b.hora || "99:99";
      return ha.localeCompare(hb);
    });

  // Totales del mes
  const totales = ventasMes.reduce(
    (acc, v) => {
      const cUnit = costoUnitDeProducto(v.productId);
      const g = gananciaBaseDeProducto(v.productId);
      const pUnit = cUnit + g;
      acc.costo += cUnit * v.qty;
      acc.venta += pUnit * v.qty;
      acc.gan += g * v.qty;
      return acc;
    },
    { costo: 0, venta: 0, gan: 0 }
  );
  const margenPct = totales.venta > 0 ? (totales.gan / totales.venta) * 100 : 0;

  // Qué debes comprar (insumos < 0)
  const faltantes = insumos
    .filter((i) => i.cantidad < 0)
    .map((i) => ({ id: i.id, nombre: i.nombre, faltante: -i.cantidad }));

  /** ---------- Deshacer última venta del mes ---------- */
  const deshacerUltimaVentaMes = () => {
    if (ventasMes.length === 0) {
      alert("No hay ventas en este mes.");
      return;
    }
    const ultima = ventasMes[ventasMes.length - 1];
    if (
      !confirm(
        `¿Deshacer la venta de "${
          (productoPorId(ultima.productId) || {}).nombre || "Producto"
        }" del ${ultima.dateISO}${ultima.hora ? " " + ultima.hora : ""}?`
      )
    )
      return;

    reponerInsumosPorVenta(ultima);
    setVentas((xs) => xs.filter((v) => v.id !== ultima.id));
  };

  /** ---------- Exportar CSV del mes (Color antes de Nombre) ---------- */
  const exportarCSV = () => {
    const rows = [
      [
        "Fecha",
        "Hora",
        "Lugar",
        "Color", // movido antes de Nombre
        "Nombre",
        "Producto",
        "Cantidad",
        "Costo unit.",
        "Ganancia",
        "Precio unit.",
        "Subtotal",
        "Observaciones",
      ],
    ];

    ventasMes.forEach((v) => {
      const p = productoPorId(v.productId);
      const nombreProd = p ? p.nombre : "—";
      const cUnit = costoUnitDeProducto(v.productId);
      const g = gananciaBaseDeProducto(v.productId);
      const pUnit = cUnit + g;
      const subtotal = pUnit * v.qty;

      rows.push([
        v.dateISO,
        v.hora || "",
        v.place || "",
        v.color || "",
        v.name || "",
        nombreProd,
        String(v.qty),
        String(cUnit.toFixed(2)),
        String(g.toFixed(2)),
        String(pUnit.toFixed(2)),
        String(subtotal.toFixed(2)),
        v.obs || "",
      ]);
    });

    const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ventas_${mes}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /** -------------------- UI -------------------- */
  return (
    <div
      style={{
        padding: 20,
        fontFamily: "sans-serif",
        maxWidth: 1220,
        margin: "0 auto",
      }}
    >
      <h1>📚 Inventario, Productos y Ventas</h1>

      {/* Tabs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}
      >
        <button
          onClick={() => setTab("insumos")}
          style={tabBtn(tab === "insumos")}
        >
          Insumos
        </button>
        <button
          onClick={() => setTab("productos")}
          style={tabBtn(tab === "productos")}
        >
          Productos
        </button>
        <button
          onClick={() => setTab("ventas")}
          style={tabBtn(tab === "ventas")}
        >
          Ventas
        </button>
      </div>

      {/* ---------------- INSUMOS ---------------- */}
      {tab === "insumos" && (
        <section>
          <h2>📦 Insumos</h2>

          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="Nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <input
              type="number"
              step="any"
              placeholder="Cantidad"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
            />
            <input
              type="number"
              step="any"
              placeholder="Precio"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
            />
            <button onClick={agregarInsumo}>Agregar</button>
          </div>

          <table
            border="1"
            cellPadding="6"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => (
                <tr key={i.id}>
                  <td>{i.nombre}</td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={i.cantidad}
                      onChange={(e) =>
                        editarInsumo(i.id, "cantidad", e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      value={i.precio}
                      onChange={(e) =>
                        editarInsumo(i.id, "precio", e.target.value)
                      }
                    />
                  </td>
                  <td>{currency.format(i.cantidad * i.precio)}</td>
                  <td>
                    <button onClick={() => eliminarInsumo(i.id)}>
                      ❌ Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {insumos.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    No hay insumos. Agrega algunos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 style={{ marginTop: 12 }}>
            💰 Valor total del inventario: {currency.format(totalInsumos)}
          </h3>
        </section>
      )}

      {/* ---------------- PRODUCTOS ---------------- */}
      {tab === "productos" && (
        <section>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2>🧺 Productos (receta + ganancia)</h2>
            <button onClick={abrirNuevoProducto}>➕ Nuevo producto</button>
          </div>

          <table
            border="1"
            cellPadding="6"
            style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}
          >
            <thead>
              <tr>
                <th>Producto</th>
                <th>Costo unit.</th>
                <th>Ganancia (USD)</th>
                <th>Precio venta</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const costo = costoProducto(p);
                const precioCalc =
                  p.ganancia !== "" && p.ganancia !== undefined
                    ? costo + Number(p.ganancia)
                    : p.precioVenta ?? "";
                return (
                  <tr key={p.id}>
                    <td>{p.nombre}</td>
                    <td>{currency.format(costo)}</td>
                    <td>
                      {p.ganancia === "" || p.ganancia === undefined
                        ? "—"
                        : currency.format(p.ganancia)}
                    </td>
                    <td>
                      {precioCalc === "" ? "—" : currency.format(precioCalc)}
                    </td>
                    <td>
                      <button onClick={() => abrirEditarProducto(p)}>
                        ✏️ Editar
                      </button>{" "}
                      <button onClick={() => eliminarProducto(p.id)}>
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {productos.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    Crea un producto y define su receta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Modal crear/editar producto */}
          {pModalOpen && (
            <div style={overlay} onClick={() => setPModalOpen(false)}>
              <div style={modal} onClick={(e) => e.stopPropagation()}>
                <form onSubmit={guardarProducto}>
                  <h3 style={{ marginTop: 0 }}>
                    {editId ? "Editar producto" : "Nuevo producto"}
                  </h3>

                  <div style={{ display: "grid", gap: 8 }}>
                    <label>
                      Nombre
                      <input
                        value={draft.nombre}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, nombre: e.target.value }))
                        }
                      />
                    </label>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "flex-end",
                      }}
                    >
                      <label>
                        Precio de venta (opcional)
                        <input
                          type="number"
                          step="any"
                          value={draft.precioVenta}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              precioVenta: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Ganancia fija (USD)
                        <input
                          type="number"
                          step="any"
                          value={draft.ganancia}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              ganancia: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <div style={{ fontWeight: 600 }}>
                        Costo actual: {currency.format(costoDraft)}
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              precioVenta: (
                                costoDraft + toNum(d.ganancia)
                              ).toFixed(2),
                            }))
                          }
                        >
                          Usar sugerido:{" "}
                          {currency.format(costoDraft + toNum(draft.ganancia))}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 6 }}>
                      <b>Receta</b>{" "}
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            receta: [
                              ...(d.receta || []),
                              { insumoId: "", cantidad: "" },
                            ],
                          }))
                        }
                      >
                        ➕ Agregar insumo
                      </button>
                      {(!insumos || insumos.length === 0) && (
                        <div style={{ color: "#b00", marginTop: 6 }}>
                          No hay insumos definidos. Ve a la pestaña “Insumos”.
                        </div>
                      )}
                      <table
                        border="1"
                        cellPadding="6"
                        style={{
                          width: "100%",
                          marginTop: 8,
                          borderCollapse: "collapse",
                        }}
                      >
                        <thead>
                          <tr>
                            <th>Insumo</th>
                            <th>Precio</th>
                            <th>Cantidad por unidad</th>
                            <th>Subcosto</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(draft.receta || []).map((r, idx) => {
                            const ins = insumoById.get(String(r.insumoId));
                            const cant = parseFloat(r.cantidad) || 0;
                            const sub = (ins ? Number(ins.precio) : 0) * cant;
                            return (
                              <tr key={idx}>
                                <td>
                                  <select
                                    value={r.insumoId}
                                    onChange={(e) =>
                                      setDraft((d) => {
                                        const receta = [...d.receta];
                                        receta[idx] = {
                                          ...receta[idx],
                                          insumoId: e.target.value,
                                        };
                                        return { ...d, receta };
                                      })
                                    }
                                  >
                                    <option value="">— Selecciona —</option>
                                    {insumos.map((i) => (
                                      <option key={i.id} value={i.id}>
                                        {i.nombre}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  {ins ? currency.format(ins.precio) : "—"}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="any"
                                    value={r.cantidad}
                                    onChange={(e) =>
                                      setDraft((d) => {
                                        const receta = [...d.receta];
                                        receta[idx] = {
                                          ...receta[idx],
                                          cantidad: e.target.value,
                                        };
                                        return { ...d, receta };
                                      })
                                    }
                                  />
                                </td>
                                <td>{currency.format(sub)}</td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraft((d) => ({
                                        ...d,
                                        receta: d.receta.filter(
                                          (_, k) => k !== idx
                                        ),
                                      }))
                                    }
                                  >
                                    ❌
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {(draft.receta || []).length === 0 && (
                            <tr>
                              <td
                                colSpan="5"
                                style={{ textAlign: "center", color: "#666" }}
                              >
                                Agrega líneas de receta con “Agregar insumo”.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        marginTop: 10,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setPModalOpen(false)}
                      >
                        Cancelar
                      </button>
                      <button type="submit">Guardar</button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ---------------- VENTAS ---------------- */}
      {tab === "ventas" && (
        <section>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h2>🧾 Ventas (mensual)</h2>
            <label>
              Mes:&nbsp;
              <input
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </label>
            <button onClick={exportarCSV}>⬇️ Exportar CSV (mes)</button>
            <button onClick={deshacerUltimaVentaMes}>
              ↩️ Deshacer última venta (mes)
            </button>
          </div>

          {/* Resumen mensual */}
          <div
            style={{
              display: "flex",
              gap: 12,
              margin: "12px 0",
              flexWrap: "wrap",
            }}
          >
            <Badge
              title="Ventas del mes"
              value={currency.format(totales.venta)}
            />
            <Badge
              title="Costo insumos"
              value={currency.format(totales.costo)}
            />
            <Badge title="Ganancia" value={currency.format(totales.gan)} />
            <Badge title="Margen %" value={`${margenPct.toFixed(1)}%`} />
          </div>

          {/* Formulario de alta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 0.7fr 1fr 1fr 0.9fr 0.6fr",
              gap: 8,
              alignItems: "end",
              margin: "12px 0",
            }}
          >
            <label>
              Producto
              <select
                value={ventaDraft.productId}
                onChange={(e) =>
                  setVentaDraft((d) => ({ ...d, productId: e.target.value }))
                }
              >
                <option value="">— Selecciona —</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cantidad
              <input
                type="number"
                step="any"
                value={ventaDraft.qty}
                onChange={(e) =>
                  setVentaDraft((d) => ({ ...d, qty: e.target.value }))
                }
              />
            </label>
            <label>
              Nombre
              <input
                value={ventaDraft.name}
                onChange={(e) =>
                  setVentaDraft((d) => ({ ...d, name: e.target.value }))
                }
              />
            </label>
            <label>
              Lugar
              <input
                value={ventaDraft.place}
                onChange={(e) =>
                  setVentaDraft((d) => ({ ...d, place: e.target.value }))
                }
              />
            </label>
            <label>
              Fecha
              <input
                type="date"
                value={ventaDraft.dateISO}
                onChange={(e) =>
                  setVentaDraft((d) => ({ ...d, dateISO: e.target.value }))
                }
              />
            </label>
            <label>
              Hora
              <input
                type="time"
                value={ventaDraft.hora}
                onChange={(e) =>
                  setVentaDraft((d) => ({ ...d, hora: e.target.value }))
                }
              />
            </label>

            <button onClick={agregarVenta}>Agregar venta</button>
          </div>

          {/* Tabla del mes */}
          <table
            border="1"
            cellPadding="6"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Costo unit.</th>
                <th>Ganancia</th>
                <th>Precio unit.</th>
                <th>Subtotal</th>
                <th>Color</th> {/* ← va antes de Nombre */}
                <th>Nombre</th>
                <th>Lugar</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Observaciones</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ventasMes.map((v) => {
                const p = productoPorId(v.productId);
                const cUnit = costoUnitDeProducto(v.productId);
                const g = gananciaBaseDeProducto(v.productId);
                const pUnit = cUnit + g;

                const rowStyle = v.color
                  ? {
                      background: `linear-gradient(0deg, ${v.color}${ALPHA}, ${v.color}${ALPHA})`,
                    }
                  : {};

                return (
                  <tr key={v.id} style={rowStyle}>
                    <td>{p ? p.nombre : "—"}</td>
                    <td>{v.qty}</td>
                    <td>{currency.format(cUnit)}</td>
                    <td>{currency.format(g)}</td>
                    <td>{currency.format(pUnit)}</td>
                    <td>{currency.format(pUnit * v.qty)}</td>

                    {/* COLOR: presets + picker + quitar */}
                    <td>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() =>
                              setVentas((xs) =>
                                xs.map((x) =>
                                  x.id === v.id ? { ...x, color: c } : x
                                )
                              )
                            }
                            title={`Usar ${c}`}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 4,
                              border: "1px solid #aaa",
                              backgroundColor: c,
                              cursor: "pointer",
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={v.color || "#ffffff"}
                          onChange={(e) =>
                            setVentas((xs) =>
                              xs.map((x) =>
                                x.id === v.id
                                  ? { ...x, color: e.target.value }
                                  : x
                              )
                            )
                          }
                          style={{
                            width: 28,
                            height: 28,
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                          }}
                          title="Elegir color personalizado"
                        />
                        <button
                          onClick={() =>
                            setVentas((xs) =>
                              xs.map((x) =>
                                x.id === v.id ? { ...x, color: "" } : x
                              )
                            )
                          }
                          title="Quitar color"
                        >
                          ✖
                        </button>
                      </div>
                    </td>

                    <td>{v.name || "—"}</td>

                    {/* LUGAR editable en tabla */}
                    <td>
                      <input
                        value={v.place || ""}
                        onChange={(e) =>
                          setVentas((xs) =>
                            xs.map((x) =>
                              x.id === v.id
                                ? { ...x, place: e.target.value }
                                : x
                            )
                          )
                        }
                        placeholder="Lugar"
                        style={{ width: 180 }}
                      />
                    </td>

                    <td>
                      <input
                        type="date"
                        value={v.dateISO}
                        onChange={(e) =>
                          setVentas((xs) =>
                            xs.map((x) =>
                              x.id === v.id
                                ? { ...x, dateISO: e.target.value }
                                : x
                            )
                          )
                        }
                        style={{ width: 140 }}
                      />
                    </td>
                    <td>
                      <input
                        type="time"
                        value={v.hora || ""}
                        onChange={(e) =>
                          setVentas((xs) =>
                            xs.map((x) =>
                              x.id === v.id ? { ...x, hora: e.target.value } : x
                            )
                          )
                        }
                        style={{ width: 110 }}
                      />
                    </td>
                    <td>
                      <input
                        value={v.obs || ""}
                        onChange={(e) =>
                          setVentas((xs) =>
                            xs.map((x) =>
                              x.id === v.id ? { ...x, obs: e.target.value } : x
                            )
                          )
                        }
                        placeholder="Notas, pedidos especiales…"
                        style={{ width: 240 }}
                      />
                    </td>
                    <td>
                      <button onClick={() => eliminarVenta(v.id)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
              {ventasMes.length === 0 && (
                <tr>
                  <td
                    colSpan="13"
                    style={{ textAlign: "center", color: "#666" }}
                  >
                    No hay ventas este mes.
                  </td>
                </tr>
              )}
            </tbody>
            {/* Totales al pie de la tabla */}
            <tfoot>
              <tr>
                <th colSpan="2" style={{ textAlign: "right" }}>
                  Totales del mes:
                </th>
                <th>{currency.format(totales.costo)}</th>
                <th>{currency.format(totales.gan)}</th>
                <th></th>
                <th>{currency.format(totales.venta)}</th>
                <th colSpan="7"></th>
              </tr>
            </tfoot>
          </table>

          {/* Qué debes comprar */}
          <div style={{ marginTop: 16 }}>
            <h3>🛒 Qué debes comprar (stock negativo)</h3>
            {faltantes.length === 0 ? (
              <div style={{ color: "#666" }}>No hay faltantes por ahora.</div>
            ) : (
              <table
                border="1"
                cellPadding="6"
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr>
                    <th>Insumo</th>
                    <th>Faltante</th>
                  </tr>
                </thead>
                <tbody>
                  {faltantes.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nombre}</td>
                      <td>{f.faltante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
