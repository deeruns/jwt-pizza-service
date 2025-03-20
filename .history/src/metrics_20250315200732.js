const config = require('./config');
const promClient = require('prom-client');
const os = require('os');
const GRAFANA_URL = process.env.GRAFANA_URL || config.GRAFANA_URL;

// Initialize metrics
const requests = {};
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests made.',
  labelNames: ['method', 'status_code', 'route'],
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request durations in seconds.',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// CPU and memory usage metrics
const cpuUsageGauge = new promClient.Gauge({
  name: 'cpu_usage_percentage',
  help: 'CPU usage percentage.',
});

const memoryUsageGauge = new promClient.Gauge({
  name: 'memory_usage_percentage',
  help: 'Memory usage percentage.',
});

// Middleware to track request metrics
function track(endpoint) {
  return (req, res, next) => {
    // Track request counts
    requests[endpoint] = (requests[endpoint] || 0) + 1;

    // Start tracking the request duration
    const start = Date.now();
    const method = req.method;
    const route = req.route ? req.route.path : req.originalUrl;

    // Set up response listener
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // duration in seconds
      const statusCode = res.statusCode;

      // Record request metrics
      httpRequestsTotal.labels(method, statusCode, route).inc();
      httpRequestDurationSeconds.labels(method, route).observe(duration);
    });

    next();
  };
}

// Periodically send metrics to Grafana
const timer = setInterval(() => {
  Object.keys(requests).forEach((endpoint) => {
    sendMetricToGrafana('requests', requests[endpoint], { endpoint });
  });

  // Send CPU and memory usage metrics
  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();
  sendMetricToGrafana('cpu_usage_percentage', cpuUsage, { source: config.metrics.source });
  sendMetricToGrafana('memory_usage_percentage', memoryUsage, { source: config.metrics.source });
}, 10000);

// Function to send metrics to Grafana
function sendMetricToGrafana(metricName, metricValue, attributes) {
  attributes = { ...attributes, source: config.source };

  const metric = {
    resourceMetrics: [
      {
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                unit: '1',
                sum: {
                  dataPoints: [
                    {
                      asInt: metricValue,
                      timeUnixNano: Date.now() * 1000000,
                      attributes: [],
                    },
                  ],
                  aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
                  isMonotonic: true,
                },
              },
            ],
          },
        ],
      },
    ],
  };

  Object.keys(attributes).forEach((key) => {
    metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
      key: key,
      value: { stringValue: attributes[key] },
    });
  });

  // Send the metric to Grafana using fetch
  fetch(`${config.metrics.url}`, {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
  })
    .then((response) => {
      if (!response.ok) {
        console.error('Failed to push metrics data to Grafana');
      } else {
        console.log(`Pushed ${metricName}`);
      }
    })
    .catch((error) => {
      console.error('Error pushing metrics:', error);
    });
}

// Get CPU usage percentage
function getCpuUsagePercentage() {
  const cpuUsage = os.loadavg()[0] / os.cpus().length;
  return (cpuUsage * 100).toFixed(2);
}

// Get memory usage percentage
function getMemoryUsagePercentage() {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsage = (usedMemory / totalMemory) * 100;
  return memoryUsage.toFixed(2);
}

// New function to send all metrics periodically
function sendMetricsPeriodically(period) {
  const timer = setInterval(() => {
    try {
      // Create a buffer to hold all the metrics data
      const buf = new MetricBuilder();

      // Call different metric functions to append data to the buffer
      httpMetrics(buf);
      systemMetrics(buf);
      userMetrics(buf);
      purchaseMetrics(buf);
      authMetrics(buf);

      // Convert metrics to a string
      const metrics = buf.toString('\n');

      // Send the aggregated metrics to Grafana
      sendMetricToGrafana(metrics);
    } catch (error) {
      console.log('Error sending metrics', error);
    }
  }, period);
}

// Example MetricBuilder class (you will need to define the MetricBuilder class)
class MetricBuilder {
  constructor() {
    this.buffer = [];
  }

  // Add a metric to the buffer
  appendMetric(name, value) {
    this.buffer.push(`${name}:${value}`);
  }

  // Convert the buffer to a string format
  toString(separator = ',') {
    return this.buffer.join(separator);
  }
}

// Example metric functions (you need to define how each of these works)
function httpMetrics(buf) {
  buf.appendMetric('http_requests_total', httpRequestsTotal.get());
  buf.appendMetric('http_request_duration_seconds', httpRequestDurationSeconds.get());
}

function systemMetrics(buf) {
  const cpuUsage = getCpuUsagePercentage();
  const memoryUsage = getMemoryUsagePercentage();
  buf.appendMetric('cpu_usage_percentage', cpuUsage);
  buf.appendMetric('memory_usage_percentage', memoryUsage);
}

// function userMetrics(buf) {
//   // Example user metrics
//   buf.appendMetric('user_signups', 42); // Placeholder value
// }

// function purchaseMetrics(buf) {
//   // Example purchase metrics
//   buf.appendMetric('purchase_count', 100); // Placeholder value
// }

// function authMetrics(buf) {
//   // Example authentication metrics
//   buf.appendMetric('auth_success_count', 200); // Placeholder value
// }

module.exports = { track, sendMetricsPeriodically };
