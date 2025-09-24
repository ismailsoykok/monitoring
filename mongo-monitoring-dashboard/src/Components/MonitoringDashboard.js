import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const INTERVAL_MS = 5000;

const MonitoringDashboard = () => {
  const [selectedRange, setSelectedRange] = useState("realtime");
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
      if (selectedRange === "realtime") {
        const res = await axios.get("http://localhost:5000/metrics");
        const now = new Date().toLocaleTimeString();

        setMetricsData(prev => ({
          operations: [...prev.operations, { time: now, ...res.data.operations }].slice(-20),
          network: [...prev.network, { time: now, ...res.data.network }].slice(-20),
          memory: [...prev.memory, { time: now, ...res.data.memory }].slice(-20),
          cpu: [...prev.cpu, { time: now, ...res.data.cpu }].slice(-20),
          connections: [...prev.connections, { time: now, ...res.data.connections }].slice(-20),
        }));
      } else {
        const hoursMap = {
          "1h": 1,
          "24h": 24,
          "7d": 168,
          "30d": 720,
        };
        const res = await axios.get(`http://localhost:5000/metrics/history?hours=${hoursMap[selectedRange]}`);
        const history = res.data;

        const formatted = {
          operations: [],
          network: [],
          memory: [],
          cpu: [],
          connections: [],
        };

        history.forEach(item => {
          const time = new Date(item.timestamp).toLocaleTimeString();

          formatted.operations.push({ time, ...item.operations });
          formatted.network.push({ time, ...item.network });
          formatted.memory.push({ time, ...item.memory });
          formatted.cpu.push({ time, ...item.cpu });
          formatted.connections.push({ time, ...item.connections });
        });

        setMetricsData(formatted);
      }
    };

    fetchData();

    if (selectedRange === "realtime") {
      interval = setInterval(fetchData, INTERVAL_MS);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedRange]);

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
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-4 text-center">
        MongoDB Cluster Monitoring
      </h1>

      <div className="flex justify-center mb-6">
        <select
          className="p-2 border rounded"
          value={selectedRange}
          onChange={(e) => setSelectedRange(e.target.value)}
        >
          <option value="realtime">⏱️ Anlık</option>
          <option value="1h">🕐 Son 1 Saat</option>
          <option value="24h">📅 Son 24 Saat</option>
          <option value="7d">🗓️ Son 1 Hafta</option>
          <option value="30d">📆 Son 1 Ay</option>
        </select>
      </div>

      <div className="flex flex-wrap justify-center gap-6 max-w-[1400px] mx-auto">
        {Object.entries(metricsData).map(([key, data]) => (
          <div
            key={key}
            className="bg-white rounded-2xl shadow p-4"
            style={{ flex: "1 1 400px", minWidth: 350, maxWidth: 450, height: 280 }}
          >
            <h2 className="text-xl font-semibold mb-2 text-center">{key.toUpperCase()}</h2>
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

export default MonitoringDashboard;
