const config = require('./config');
const os = require('os');

class Metrics {
    constructor() {
        this.source = config.metrics.source;
        this.url = config.metrics.url;
        this.apiKey = config.metrics.apiKey;
        console.log('Metrics initialized:', { source: this.source, url: this.url, apiKey: this.apiKey });
        this.requestCounters = new Map();
        this.pizzaPurchases = 0;
        this.pizzaRevenue = 0;
        this.activeUsers = new Set();
        this.sendMetricsPeriodically(10000);
    }

    sendMetricToGrafana(metricName, metricValue, type, unit) {
        const metric = {
          resourceMetrics: [
            {
              scopeMetrics: [
                {
                  metrics: [
                    {
                      name: metricName,
                      unit: unit,
                      [type]: {
                        dataPoints: [
                          {
                            asInt: metricValue,
                            timeUnixNano: Date.now() * 1000000,
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        };
      
        if (type === 'sum') {
          metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].aggregationTemporality = 'AGGREGATION_TEMPORALITY_CUMULATIVE';
          metric.resourceMetrics[0].scopeMetrics[0].metrics[0][type].isMonotonic = true;
        }
      
        const body = JSON.stringify(metric);
        fetch(`${this.url}`, {
          method: 'POST',
          body: body,
          headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        })
          .then((response) => {
            if (!response.ok) {
              response.text().then((text) => {
                console.error(`Failed to push metrics data to Grafana: ${text}\n${body}`);
              });
            } else {
              console.log(`Pushed ${metricName}`);
            }
          })
          .catch((error) => {
            console.error('Error pushing metrics:', error);
          });
    }


    requestTracker(req, res, next) {
        const start = process.hrtime();
        const method = req.method;
        const route = req.route ? req.route.path : req.originalUrl || req.path;
        const requestKey = `${method}:${route}`;

        // Track active users (assuming token is present for authenticated requests)
        if (req.headers.authorization) {
            const token = req.headers.authorization.split(' ')[1];
            this.activeUsers.add(token); // Using token as a proxy for user identity
        }

        // Special handling for pizza orders
        if (method === 'POST' && route === '/api/order') {
            const originalJson = res.json;
            res.json = function(body) {
                // Calculate order details
                if (body && body.items) {
                    const items = body.items;
                    const orderTotal = items.reduce((sum, item) => sum + item.price, 0);
                    this.pizzaPurchases += items.length;
                    this.pizzaRevenue += orderTotal;

                    // Send pizza-specific metrics immediately after order
                    this.sendMetricToGrafana('pizza_purchases_total', this.pizzaPurchases, 'sum', '1');
                    this.sendMetricToGrafana('pizza_revenue_total', Math.round(this.pizzaRevenue * 100), 'sum', 'cents');
                }
                originalJson.apply(res, arguments);
            }.bind(this);
        }

        res.on('finish', () => {
            const [seconds, nanoseconds] = process.hrtime(start);
            const latencyMs = (seconds * 1000) + (nanoseconds / 1000000);

            // Increment request counter
            const currentCount = this.requestCounters.get(requestKey) || 0;
            this.requestCounters.set(requestKey, currentCount + 1);

            // Send general request metrics
            this.sendMetricToGrafana('http_requests_total', this.requestCounters.get(requestKey), 'sum', '1');

            // Send latency metric for all requests
            this.sendMetricToGrafana('http_request_latency_ms', Math.round(latencyMs), 'gauge', 'ms');

            // Send pizza order latency specifically
            if (method === 'POST' && route === '/api/order') {
                this.sendMetricToGrafana('pizza_order_latency_ms', Math.round(latencyMs), 'gauge', 'ms');
            }
        });

        next();
    }

    sendMetricsPeriodically(period) {
        setInterval(() => {
            try {
                const cpuUsage = this.getCpuUsagePercentage();
                const memoryUsage = this.getMemoryUsagePercentage();
                
                this.sendMetricToGrafana('cpu_usage_percentage', Math.round(cpuUsage), 'gauge', '%');
                this.sendMetricToGrafana('memory_usage_percentage', Math.round(memoryUsage), 'gauge', '%');
                
                // Send active users count periodically
                this.sendMetricToGrafana('active_users', this.activeUsers.size, 'gauge', 'users');
                
                // Optional: Clear active users periodically if you want to track only recent activity
                // this.activeUsers.clear();
            } catch (error) {
                console.error('Error sending metrics:', error);
            }
        }, period);
    }



    // requestTracker(req, res, next) {
    //     console.log(`Tracking request: ${req.method} ${req.path}`);
    //     const start = Date.now();
    //     const method = req.method;
    //     const route = req.route ? req.route.path : req.originalUrl || req.path;
        
    //     // Create a unique key for this request type
    //     const requestKey = `${method}:${route}`;
        
    //     // Increment counter for this request type
    //     const currentCount = this.requestCounters.get(requestKey) || 0;
    //     this.requestCounters.set(requestKey, currentCount + 1);

    //     res.on('finish', () => {
    //         const duration = Date.now() - start;
    //         const statusCode = res.statusCode;

    //         // Send total requests metric
    //         this.sendMetricToGrafana(
    //             'http_requests_total',
    //             this.requestCounters.get(requestKey),
    //             'sum',
    //             '1'
    //         );

    //         // Send duration metric
    //         this.sendMetricToGrafana(
    //             'http_request_duration_ms',
    //             duration,
    //             'gauge',  // Changed to gauge as this is a point-in-time measurement
    //             'ms'
    //         );
    //     });

    //     next();
    // }

    getCpuUsagePercentage() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        return Number((cpuUsage * 100).toFixed(2));
    }

    getMemoryUsagePercentage() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        return Number(((usedMemory / totalMemory) * 100).toFixed(2));
    }

    // sendMetricsPeriodically(period) {
    //     setInterval(() => {
    //         try {
    //             const cpuUsage = this.getCpuUsagePercentage();
    //             const memoryUsage = this.getMemoryUsagePercentage();
                
    //             this.sendMetricToGrafana(
    //                 'cpu_usage_percentage',
    //                 Math.round(cpuUsage),
    //                 'gauge',              
    //                 '%'                  
    //             );
                
    //             this.sendMetricToGrafana(
    //                 'memory_usage_percentage',
    //                 Math.round(memoryUsage),
    //                 'gauge',
    //                 '%'
    //             );
    //         } catch (error) {
    //             console.error('Error sending metrics:', error);
    //         }
    //     }, period);
    // }
}

module.exports = new Metrics();



















// const config = require('./config');
// const os = require('os');

// class Metrics {

//     constructor() {
//         // Initialize any state if needed (e.g., counters, config)
//         this.source = config.metrics.source;
//         this.url = config.metrics.url;
//         this.apiKey = config.metrics.apiKey;
    
//         // Start periodic metrics reporting on instantiation
//         this.sendMetricsPeriodically(10000); // Every 10 seconds
//       }

//     //   sendMetricToGrafana(metricName, metricValue, attributes) {
//     //       attributes = { ...attributes, source: config.source };
        
//     //       const metric = {
//     //         resourceMetrics: [
//     //           {
//     //             scopeMetrics: [
//     //               {
//     //                 metrics: [
//     //                   {
//     //                     name: metricName,
//     //                     unit: '1',
//     //                     sum: {
//     //                       dataPoints: [
//     //                         {
//     //                           asInt: metricValue,
//     //                           timeUnixNano: Date.now() * 1000000,
//     //                           attributes: [],
//     //                         },
//     //                       ],
//     //                       aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
//     //                       isMonotonic: true,
//     //                     },
//     //                   },
//     //                 ],
//     //               },
//     //             ],
//     //           },
//     //         ],
//     //       };
        
//     //       Object.keys(attributes).forEach((key) => {
//     //         metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
//     //           key: key,
//     //           value: { stringValue: attributes[key] },
//     //         });
//     //       });
        
//     //       // Send the metric to Grafana using fetch
//     //       //const message = JSON.stringify(metric, null, 2); // Pretty-print with indentation
//     //       //console.log("metric: %s", message);

//     //       fetch(`${config.metrics.url}`, {
//     //         method: 'POST',
//     //         body: JSON.stringify(metric),
//     //         headers: {
//     //           Authorization: `Bearer ${config.metrics.apiKey}`,
//     //           'Content-Type': 'application/json',
//     //         },
//     //       })

//     //         .then((response) => {
//     //           if (!response.ok) {
//     //             const res = JSON.stringify(response);
//     //             //const res = new Response(response).json()
//     //             console.log("response: %s", res);
//     //             console.error('Failed to push metrics data to Grafana');
//     //           } else {
//     //             console.log(`Pushed ${metricName}`);
//     //           }
//     //         })
//     //         .catch((error) => {
//     //           console.error('Error pushing metrics:', error);
//     //         });
//     //     }




// // Metric sending function to Grafana (InfluxDB-compatible)
//     sendMetricToGrafana(metricName, metricValue, attributes = {}) {
//     const metric = {
//         metric: metricName,
//         value: metricValue,
//         tags: { ...attributes, source: config.metrics.source },
//         timestamp: Date.now(),
//     };

//     // const message = JSON.stringify(metric, null, 2); // Pretty-print with indentation
//     // console.log("metric: %s", message);

//     fetch(config.metrics.url, {
//         method: 'POST',
//         body: JSON.stringify(metric),
//         headers: {
//         Authorization: `Bearer ${config.metrics.apiKey}`,
//         'Content-Type': 'application/json',
//         },
//     })
//         .then((response) => {
//         if (!response.ok) {
//             response.text().then((text) => {
//             console.error(`Failed to push ${metricName}: ${response.status} - ${text}`);
//             });
//         } else {
//             console.log(`Pushed ${metricName}`);
//         }
//         })
//         .catch((error) => {
//         console.error(`Error pushing ${metricName}:`, error);
//         });
//     }



//     // Middleware to track HTTP request metrics
//     requestTracker(req, res, next) {
//         console.log(`Tracking request: ${req.method} ${req.path}`);
//         const start = Date.now();
//         const method = req.method;
//         const route = req.route ? req.route.path : req.originalUrl || req.path; // Fallback to req.path if route is undefined

//         res.on('finish', () => {
//             const duration = Date.now() - start; // in milliseconds
//             const statusCode = res.statusCode;

//             // Send HTTP request metrics
//             this.sendMetricToGrafana('http_requests_total', 1, {
//             method,
//             status_code: statusCode,
//             route,
//             });
//             this.sendMetricToGrafana('http_request_duration_ms', duration, {
//             method,
//             route,
//             });
//         });

//         next();
//     }

//     //System metrics functions
//     getCpuUsagePercentage() {
//         const cpuUsage = os.loadavg()[0] / os.cpus().length;
//         // const number = Number((cpuUsage * 100).toFixed(2));
//         // console.log("val: %s", number);
//         return Number((cpuUsage * 100).toFixed(2)); // Convert to number
//     }

//     getMemoryUsagePercentage() {
//         const totalMemory = os.totalmem();
//         const freeMemory = os.freemem();
//         const usedMemory = totalMemory - freeMemory;
//         return Number(((usedMemory / totalMemory) * 100).toFixed(2)); // Convert to number
//     }

//     // Periodic metrics reporting
//     sendMetricsPeriodically(period) {
//         setInterval(() => {
//             try {
//             const cpuUsage = this.getCpuUsagePercentage();
//             const memoryUsage = this.getMemoryUsagePercentage();
//             //send metrics
//             this.sendMetricToGrafana('cpu_usage_percentage', cpuUsage);
//             this.sendMetricToGrafana('memory_usage_percentage', memoryUsage);
//             } catch (error) {
//             console.error('Error sending metrics:', error);
//             }
//         }, period);
//     }
// }

// // Start periodic reporting (every 10 seconds)
// //sendMetricsPeriodically(10000);

// module.exports = new Metrics();























// const config = require('./config');
// const promClient = require('prom-client');
// const os = require('os');
// const GRAFANA_URL = process.env.GRAFANA_URL || config.GRAFANA_URL;

// // Initialize metrics
// const requests = {};
// const httpRequestsTotal = new promClient.Counter({
//   name: 'http_requests_total',
//   help: 'Total number of HTTP requests made.',
//   labelNames: ['method', 'status_code', 'route'],
// });

// const httpRequestDurationSeconds = new promClient.Histogram({
//   name: 'http_request_duration_seconds',
//   help: 'Histogram of HTTP request durations in seconds.',
//   labelNames: ['method', 'route'],
//   buckets: [0.1, 0.5, 1, 2, 5, 10],
// });

// // CPU and memory usage metrics
// const cpuUsageGauge = new promClient.Gauge({
//   name: 'cpu_usage_percentage',
//   help: 'CPU usage percentage.',
// });

// const memoryUsageGauge = new promClient.Gauge({
//   name: 'memory_usage_percentage',
//   help: 'Memory usage percentage.',
// });

// Middleware to track request metrics
// function track(endpoint) {
//   return (req, res, next) => {
//     // Track request counts
//     requests[endpoint] = (requests[endpoint] || 0) + 1;

//     // Start tracking the request duration
//     const start = Date.now();
//     const method = req.method;
//     const route = req.route ? req.route.path : req.originalUrl;

//     // Set up response listener
//     res.on('finish', () => {
//       const duration = (Date.now() - start) / 1000; // duration in seconds
//       const statusCode = res.statusCode;

//       // Record request metrics
//       httpRequestsTotal.labels(method, statusCode, route).inc();
//       httpRequestDurationSeconds.labels(method, route).observe(duration);
//     });

//     next();
//   };
// }

// // Periodically send metrics to Grafana
// const timer = setInterval(() => {
//   Object.keys(requests).forEach((endpoint) => {
//     sendMetricToGrafana('requests', requests[endpoint], { endpoint });
//   });

//   // Send CPU and memory usage metrics
//   const cpuUsage = getCpuUsagePercentage();
//   const memoryUsage = getMemoryUsagePercentage();
//   sendMetricToGrafana('cpu_usage_percentage', cpuUsage, { source: config.metrics.source });
//   sendMetricToGrafana('memory_usage_percentage', memoryUsage, { source: config.metrics.source });
// }, 10000);

// // Function to send metrics to Grafana
// function sendMetricToGrafana(metricName, metricValue, attributes) {
//   attributes = { ...attributes, source: config.source };

//   const metric = {
//     resourceMetrics: [
//       {
//         scopeMetrics: [
//           {
//             metrics: [
//               {
//                 name: metricName,
//                 unit: '1',
//                 sum: {
//                   dataPoints: [
//                     {
//                       asInt: metricValue,
//                       timeUnixNano: Date.now() * 1000000,
//                       attributes: [],
//                     },
//                   ],
//                   aggregationTemporality: 'AGGREGATION_TEMPORALITY_CUMULATIVE',
//                   isMonotonic: true,
//                 },
//               },
//             ],
//           },
//         ],
//       },
//     ],
//   };

//   Object.keys(attributes).forEach((key) => {
//     metric.resourceMetrics[0].scopeMetrics[0].metrics[0].sum.dataPoints[0].attributes.push({
//       key: key,
//       value: { stringValue: attributes[key] },
//     });
//   });

//   // Send the metric to Grafana using fetch
//   fetch(`${config.metrics.url}`, {
//     method: 'POST',
//     body: JSON.stringify(metric),
//     headers: {
//       Authorization: `Bearer ${config.metrics.apiKey}`,
//       'Content-Type': 'application/json',
//     },
//   })
//     .then((response) => {
//       if (!response.ok) {
//         console.error('Failed to push metrics data to Grafana');
//       } else {
//         console.log(`Pushed ${metricName}`);
//       }
//     })
//     .catch((error) => {
//       console.error('Error pushing metrics:', error);
//     });
// }

// // Get CPU usage percentage
// function getCpuUsagePercentage() {
//   const cpuUsage = os.loadavg()[0] / os.cpus().length;
//   return (cpuUsage * 100).toFixed(2);
// }

// // Get memory usage percentage
// function getMemoryUsagePercentage() {
//   const totalMemory = os.totalmem();
//   const freeMemory = os.freemem();
//   const usedMemory = totalMemory - freeMemory;
//   const memoryUsage = (usedMemory / totalMemory) * 100;
//   return memoryUsage.toFixed(2);
// }

// // New function to send all metrics periodically
// function sendMetricsPeriodically(period) {
//   const timer = setInterval(() => {
//     try {
//       // Create a buffer to hold all the metrics data
//       const buf = new MetricBuilder();

//       // Call different metric functions to append data to the buffer
//       httpMetrics(buf);
//       systemMetrics(buf);
//       userMetrics(buf);
//       purchaseMetrics(buf);
//       authMetrics(buf);

//       // Convert metrics to a string
//       const metrics = buf.toString('\n');

//       // Send the aggregated metrics to Grafana
//       sendMetricToGrafana(metrics);
//     } catch (error) {
//       console.log('Error sending metrics', error);
//     }
//   }, period);
// }

// // Example MetricBuilder class (you will need to define the MetricBuilder class)
// class MetricBuilder {
//   constructor() {
//     this.buffer = [];
//   }

//   // Add a metric to the buffer
//   appendMetric(name, value) {
//     this.buffer.push(`${name}:${value}`);
//   }

//   // Convert the buffer to a string format
//   toString(separator = ',') {
//     return this.buffer.join(separator);
//   }
// }

// // Example metric functions (you need to define how each of these works)
// function httpMetrics(buf) {
//   buf.appendMetric('http_requests_total', httpRequestsTotal.get());
//   buf.appendMetric('http_request_duration_seconds', httpRequestDurationSeconds.get());
// }

// function systemMetrics(buf) {
//   const cpuUsage = getCpuUsagePercentage();
//   const memoryUsage = getMemoryUsagePercentage();
//   buf.appendMetric('cpu_usage_percentage', cpuUsage);
//   buf.appendMetric('memory_usage_percentage', memoryUsage);
// }

// // function userMetrics(buf) {
// //   // Example user metrics
// //   buf.appendMetric('user_signups', 42); // Placeholder value
// // }

// // function purchaseMetrics(buf) {
// //   // Example purchase metrics
// //   buf.appendMetric('purchase_count', 100); // Placeholder value
// // }

// // function authMetrics(buf) {
// //   // Example authentication metrics
// //   buf.appendMetric('auth_success_count', 200); // Placeholder value
// // }

// module.exports = { track, sendMetricsPeriodically };
