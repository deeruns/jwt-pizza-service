// app.js or your main Express server file
const express = require('express');
const metrics = require('./src/metrics'); // Import the metrics module

const app = express();

// Use the metrics middleware to track all HTTP requests
app.use(metrics.requestTracker);

// Example route for metrics scraping
app.get('/metrics', metrics.metricsEndpoint);

// Example Express routes
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.get('/hello', (req, res) => {
  res.send('Hello, Grafana!');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
