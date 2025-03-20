// src/metrics.js
const client = require('prom-client');

// Define a registry to hold all metrics
const register = new client.Registry();

// Define HTTP request metrics
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests made.',
  labelNames: ['method', 'status_code', 'route'],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request durations in seconds.',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

// Expose the metrics registry for Grafana
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register });

// Middleware for tracking request metrics
function requestTracker(req, res, next) {
  const start = Date.now();
  const route = req.route ? req.route.path : req.originalUrl;
  const method = req.method;

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const statusCode = res.statusCode;

    // Record the HTTP request total and duration
    httpRequestsTotal.labels(method, statusCode, route).inc();
    httpRequestDurationSeconds.labels(method, route).observe(duration);
  });

  next();
}

// Expose metrics as an endpoint (for Grafana to scrape)
function metricsEndpoint(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}

module.exports = {
  requestTracker,
  metricsEndpoint,
};
