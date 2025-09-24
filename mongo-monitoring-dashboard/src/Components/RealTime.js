import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const INTERVAL_MS = 1000;

const RealtimePage = () => {
  const [metricsData, setMetricsData] = useState({
    operations: [],
    network: [],
    memory: [],
    cpu: [],
    connections: [],
  });

  useEffect(() => {
    let interval;

    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:5000/metrics");
        const now = new Date().toLocaleTimeString();

        setMetricsData(prev => ({
          operations: [...prev.operations, { time: now, ...res.data.operations }].slice(-20),
          network: [...prev.network, { time: now, ...res.data.network }].slice(-20),
          memory: [...prev.memory, { time: now, ...res.data.memory }].slice(-20),
          cpu: [...prev.cpu, { time: now, ...res.data.cpu }].slice(-20),
          connections: [...prev.connections, { time: now, ...res.data.connections }].slice(-20),
        }));
      } catch (err) {
        console.error("Anlık veri alınamadı:", err);
      }
    };

    fetchData();
    interval = setInterval(fetchData, INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const lineDefs = {
    operations: [
      { key: "insert", color: "#8884d8", name: "Insert/sec" },
      { key: "query", color: "#82ca9d", name: "Query/sec" },
      { key: "update", color: "#ffc658", name: "Update/sec" },
      { key: "delete", color: "#d0ed57", name: "Delete/sec" },
    ],
    network: [
      { key: "bytesIn", color: "#8884d8", name: "Bytes In/sec" },
      { key: "bytesOut", color: "#82ca9d", name: "Bytes Out/sec" },
      { key: "numRequests", color: "#ffc658", name: "Num Requests/sec" },
    ],
    memory: [
      { key: "resident", color: "#8884d8", name: "Resident MB" },
      { key: "virtual", color: "#82ca9d", name: "Virtual MB" },
      { key: "mapped", color: "#ffc658", name: "Mapped MB" },
    ],
    cpu: [
      { key: "user", color: "#8884d8", name: "CPU User" },
      { key: "system", color: "#82ca9d", name: "CPU System" },
      { key: "idle", color: "#ffc658", name: "CPU Idle" },
    ],
    connections: [
      { key: "current", color: "#8884d8", name: "Current Connections" },
      { key: "available", color: "#82ca9d", name: "Available Connections" },
    ],
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>Anlık MongoDB Cluster Monitoring</h1>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 24,
        maxWidth: 1400,
        margin: "0 auto",
      }}>
        {Object.entries(metricsData).map(([key, data]) => (
          <div
            key={key}
            style={{
              flex: "1 1 400px",
              minWidth: 350,
              maxWidth: 450,
              height: 280,
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 16,
              boxShadow: "0 2px 8px rgb(0 0 0 / 0.1)",
            }}
          >
            <h2 style={{ textAlign: "center", marginBottom: 8 }}>{key.toUpperCase()}</h2>
            <ResponsiveContainer width="100%" height="85%">
              <LineChart data={data}>
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                {lineDefs[key].map(({ key: dataKey, color, name }) => (
                  <Line
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={color}
                    name={name}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RealtimePage;
