const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const os = require('os');

const app = express();
app.use(cors());

const PORT = 5000;
const uri = 'mongodb://localhost:27017';

let previousMetrics = null;
let previousTimestamp = null;

// CPU kullanımı için önce toplam ve idle süreleri alıyoruz
function getCpuTimes() {
  const cpus = os.cpus();

  let user = 0;
  let nice = 0;
  let sys = 0;
  let idle = 0;
  let irq = 0;

  cpus.forEach(cpu => {
    user += cpu.times.user;
    nice += cpu.times.nice;
    sys += cpu.times.sys;
    idle += cpu.times.idle;
    irq += cpu.times.irq;
  });

  return { user, nice, sys, idle, irq };
}

app.get('/metrics', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const adminDb = client.db().admin();
    const monitoringDb = client.db('monitoring');
    const metricsCollection = monitoringDb.collection('metrics');

    const serverStatus = await adminDb.command({ serverStatus: 1 });
    const now = Date.now();

    // MongoDB metricleri
    const currentMetrics = {
      operations: serverStatus.opcounters,
      network: serverStatus.network,
      memory: serverStatus.mem,
      // cpu: serverStatus.cpu, // MongoDB cpu bilgisi boşsa kullanmıyoruz
      connections: serverStatus.connections,
    };

    // İşletim sistemi CPU bilgisi
    const currentCpuTimes = getCpuTimes();

    if (!previousMetrics) {
      previousMetrics = currentMetrics;
      previousTimestamp = now;
      previousCpuTimes = currentCpuTimes;

      // İlk istek için 0 dönebiliriz ya da başlangıç verisi
      return res.json({
        operations: { insert: 0, query: 0, update: 0, delete: 0 },
        network: { bytesIn: 0, bytesOut: 0, numRequests: 0 },
        memory: currentMetrics.memory,
        cpu: { user: 0, system: 0, idle: 0 },
        connections: currentMetrics.connections,
      });
    }

    const intervalSec = (now - previousTimestamp) / 1000;

    // MongoDB işlemleri rate
    const calcRate = (current, previous) => (current - previous) / intervalSec;

    const operationsRate = {
      insert: calcRate(currentMetrics.operations.insert, previousMetrics.operations.insert),
      query: calcRate(currentMetrics.operations.query, previousMetrics.operations.query),
      update: calcRate(currentMetrics.operations.update, previousMetrics.operations.update),
      delete: calcRate(currentMetrics.operations.delete, previousMetrics.operations.delete),
    };

    const networkRate = {
      bytesIn: calcRate(currentMetrics.network.bytesIn, previousMetrics.network.bytesIn),
      bytesOut: calcRate(currentMetrics.network.bytesOut, previousMetrics.network.bytesOut),
      numRequests: calcRate(currentMetrics.network.numRequests, previousMetrics.network.numRequests),
    };

    // OS CPU kullanımını hesapla
    const prevCpu = previousCpuTimes;
    const currCpu = currentCpuTimes;

    const prevIdle = prevCpu.idle;
    const currIdle = currCpu.idle;

    const prevTotal = prevCpu.user + prevCpu.nice + prevCpu.sys + prevCpu.idle + prevCpu.irq;
    const currTotal = currCpu.user + currCpu.nice + currCpu.sys + currCpu.idle + currCpu.irq;

    const totalDiff = currTotal - prevTotal;
    const idleDiff = currIdle - prevIdle;

    // CPU kullanımı yüzdesi
    const cpuUsagePercent = totalDiff > 0 ? ((totalDiff - idleDiff) / totalDiff) * 100 : 0;

    // User, System ve Idle değerleri yüzdelik
    const cpuUsage = {
      user: ((currCpu.user - prevCpu.user) / totalDiff) * 100 || 0,
      system: ((currCpu.sys - prevCpu.sys) / totalDiff) * 100 || 0,
      idle: ((currCpu.idle - prevCpu.idle) / totalDiff) * 100 || 0,
      usagePercent: cpuUsagePercent.toFixed(2),
    };

    // Diğer metrikler
    const memory = currentMetrics.memory;
    const connections = currentMetrics.connections;

    // Güncelle
    previousMetrics = currentMetrics;
    previousTimestamp = now;
    previousCpuTimes = currentCpuTimes;

    // Kaydetme kısmı isteğe bağlı, dilersen açabilirsin
    await metricsCollection.insertOne({
      timestamp: new Date(),
      operations: operationsRate,
      network: networkRate,
      memory,
      cpu: cpuUsage,
      connections,
    });

    res.json({
      operations: operationsRate,
      network: networkRate,
      memory,
      cpu: cpuUsage,
      connections,
    });
  } catch (err) {
    console.error('Metrik hatası:', err);
    res.status(500).json({ error: 'Metrikler alınamadı' });
  } finally {
    await client.close();
  }
});

app.get('/metrics/history', async (req, res) => {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const monitoringDb = client.db('monitoring');
    const metricsCollection = monitoringDb.collection('metrics');

    const hours = parseInt(req.query.hours) || 1;

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const results = await metricsCollection
      .find({ timestamp: { $gte: since } })
      .sort({ timestamp: 1 })
      .toArray();

    res.json(results);
  } catch (err) {
    console.error('Geçmiş metrik hatası:', err);
    res.status(500).json({ error: 'Geçmiş metrikler alınamadı' });
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend çalışıyor: http://localhost:${PORT}`);
});
