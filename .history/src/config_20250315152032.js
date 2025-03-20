module.exports =  {
    jwtSecret: 'peesha',
    db: {
      connection: {
        host: '127.0.0.1',
        //host: 'host.docker.internal',
        user: 'root',
        password: 'DavinDee144218!',
        database: 'pizza',
        connectTimeout: 60000,
      },
      // connection: {
      //   //host: '127.0.0.1',
      //   host: 'host.docker.internal',
      //   user: 'admin',
      //   password: 'DavinDee144218',
      //   database: 'pizza',
      //   connectTimeout: 60000,
      // },
      listPerPage: 10,
    },
    factory: {
      url: 'https://pizza-factory.cs329.click',
      apiKey: 'd27f60ec1a9645e681c86ab25ae72573',
    },
    metrics: {
      //source: process.env.NODE_ENV === 'production' ? 'jwt-pizza-service' : 'jwt-pizza-service-dev',
      source: 'jwt-pizza-service-dev',
      url: 'https://influx-prod-13-prod-us-east-0.grafana.net/api/v1/push/influx/write',
      apiKey: 'glc_eyJvIjoiMTM3NTQyNCIsIm4iOiJzdGFjay0xMTk5MTkwLWludGVncmF0aW9uLWp3dC1waXp6YS1tZXRyaWNzIiwiayI6IlAxRjFmeXN1NjFBNjQzZTlEd04wdWlnNCIsIm0iOnsiciI6InByb2QtdXMtd2VzdC0wIn19',
      userId: '1199190'
    },
 };
 