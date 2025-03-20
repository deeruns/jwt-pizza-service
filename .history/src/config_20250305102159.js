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
 };
 