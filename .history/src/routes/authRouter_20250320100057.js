// const express = require('express');
// const jwt = require('jsonwebtoken');
// const config = require('../config.js');
// const { asyncHandler } = require('../endpointHelper.js');
// const { DB, Role } = require('../database/database.js');
// const metrics = require('../metrics.js');
// const authRouter = express.Router();

// //track the endpoints
// authRouter.use(metrics.requestTracker);

// authRouter.endpoints = [
//   {
//     method: 'POST',
//     path: '/api/auth',
//     description: 'Register a new user',
//     example: `curl -X POST localhost:3000/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'`,
//     response: { user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'tttttt' },
//   },
//   {
//     method: 'PUT',
//     path: '/api/auth',
//     description: 'Login existing user',
//     example: `curl -X PUT localhost:3000/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json'`,
//     response: { user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'tttttt' },
//   },
//   {
//     method: 'PUT',
//     path: '/api/auth/:userId',
//     requiresAuth: true,
//     description: 'Update user',
//     example: `curl -X PUT localhost:3000/api/auth/1 -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
//     response: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
//   },
//   {
//     method: 'DELETE',
//     path: '/api/auth',
//     requiresAuth: true,
//     description: 'Logout a user',
//     example: `curl -X DELETE localhost:3000/api/auth -H 'Authorization: Bearer tttttt'`,
//     response: { message: 'logout successful' },
//   },
// ];

// async function setAuthUser(req, res, next) {
//   const token = readAuthToken(req);
//   if (token) {
//     try {
//       if (await DB.isLoggedIn(token)) {
//         // Check the database to make sure the token is valid.
//         req.user = jwt.verify(token, config.jwtSecret);
//         req.user.isRole = (role) => !!req.user.roles.find((r) => r.role === role);
//       }
//     } catch {
//       req.user = null;
//     }
//   }
//   next();
// }

// // Authenticate token
// authRouter.authenticateToken = (req, res, next) => {
//   //console.log("auth endpoint");
//   if (!req.user) {
//     return res.status(401).send({ message: 'unauthorized' });
//   }
//   next();
// };

// // register
// authRouter.post(
//   '/',
//   asyncHandler(async (req, res) => {
//     //console.log("register endpoint");
//     const { name, email, password } = req.body;
//     if (!name || !email || !password) {
//       return res.status(400).json({ message: 'name, email, and password are required' });
//     }
//     const user = await DB.addUser({ name, email, password, roles: [{ role: Role.Diner }] });
//     const auth = await setAuth(user);
//     res.json({ user: user, token: auth });
//   })
  
// );

// // login
// authRouter.put(
//   '/',
//   asyncHandler(async (req, res) => {
//     //console.log("login endpoint");
//     const { email, password } = req.body;
//     const user = await DB.getUser(email, password);
//     const auth = await setAuth(user);
//     res.json({ user: user, token: auth });
//   })
// );

// // logout
// authRouter.delete(
//   '/',
//   authRouter.authenticateToken,
//   asyncHandler(async (req, res) => {
//     await clearAuth(req);
//     res.json({ message: 'logout successful' });
//   })
// );

// // updateUser
// authRouter.put(
//   '/:userId',
//   authRouter.authenticateToken,
//   asyncHandler(async (req, res) => {
//     const { email, password } = req.body;
//     const userId = Number(req.params.userId);
//     const user = req.user;
//     if (user.id !== userId && !user.isRole(Role.Admin)) {
//       return res.status(403).json({ message: 'unauthorized' });
//     }

//     const updatedUser = await DB.updateUser(userId, email, password);
//     res.json(updatedUser);
//   })
// );

// async function setAuth(user) {
//   const token = jwt.sign(user, config.jwtSecret);
//   await DB.loginUser(user.id, token);
//   return token;
// }

// async function clearAuth(req) {
//   const token = readAuthToken(req);
//   if (token) {
//     await DB.logoutUser(token);
//   }
// }

// function readAuthToken(req) {
//   const authHeader = req.headers.authorization;
//   if (authHeader) {
//     return authHeader.split(' ')[1];
//   }
//   return null;
// }

// module.exports = { authRouter, setAuthUser };
























const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config.js');
const { asyncHandler } = require('../endpointHelper.js');
const { DB, Role } = require('../database/database.js');
const metrics = require('../metrics.js');
const authRouter = express.Router();

// Track the endpoints with metrics
authRouter.use(metrics.requestTracker);

authRouter.endpoints = [
  {
    method: 'POST',
    path: '/api/auth',
    description: 'Register a new user',
    example: `curl -X POST localhost:3000/api/auth -d '{"name":"pizza diner", "email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json'`,
    response: { user: { id: 2, name: 'pizza diner', email: 'd@jwt.com', roles: [{ role: 'diner' }] }, token: 'tttttt' },
  },
  {
    method: 'PUT',
    path: '/api/auth',
    description: 'Login existing user',
    example: `curl -X PUT localhost:3000/api/auth -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json'`,
    response: { user: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] }, token: 'tttttt' },
  },
  {
    method: 'PUT',
    path: '/api/auth/:userId',
    requiresAuth: true,
    description: 'Update user',
    example: `curl -X PUT localhost:3000/api/auth/1 -d '{"email":"a@jwt.com", "password":"admin"}' -H 'Content-Type: application/json' -H 'Authorization: Bearer tttttt'`,
    response: { id: 1, name: '常用名字', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
  },
  {
    method: 'DELETE',
    path: '/api/auth',
    requiresAuth: true,
    description: 'Logout a user',
    example: `curl -X DELETE localhost:3000/api/auth -H 'Authorization: Bearer tttttt'`,
    response: { message: 'logout successful' },
  },
];

async function setAuthUser(req, res, next) {
  console.log('Entering setAuthUser middleware');
  const token = readAuthToken(req);
  if (token) {
    console.log('Token found:', token);
    try {
      if (await DB.isLoggedIn(token)) {
        console.log('Token is valid in DB');
        req.user = jwt.verify(token, config.jwtSecret);
        req.user.isRole = (role) => !!req.user.roles.find((r) => r.role === role);
        console.log('User set:', req.user);
      } else {
        console.log('Token not logged in DB');
      }
    } catch (error) {
      console.log('Token verification failed:', error.message);
      req.user = null;
    }
  } else {
    console.log('No token found in request');
  }
  next();
}

// Authenticate token
authRouter.authenticateToken = (req, res, next) => {
  console.log('Entering authenticateToken middleware');
  if (!req.user) {
    console.log('No user found, returning 401');
    return res.status(401).send({ message: 'unauthorized' });
  }
  console.log('User authenticated, proceeding');
  next();
};

// Register
authRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    console.log('POST /api/auth - Register endpoint reached');
    const { name, email, password } = req.body;
    console.log('Request body:', { name, email, password });
    if (!name || !email || !password) {
      console.log('Missing required fields, returning 400');
      return res.status(400).json({ message: 'name, email, and password are required' });
    }
    const user = await DB.addUser({ name, email, password, roles: [{ role: Role.Diner }] });
    console.log('User added:', user);
    const auth = await setAuth(user);
    console.log('Auth token generated:', auth);
    res.json({ user: user, token: auth });
  })
);

// Login
authRouter.put(
  '/',
  asyncHandler(async (req, res) => {
    console.log('PUT /api/auth - Login endpoint reached');
    const { email, password } = req.body;
    console.log('Request body:', { email, password });
    const user = await DB.getUser(email, password);
    console.log('User retrieved:', user);
    const auth = await setAuth(user);
    console.log('Auth token generated:', auth);
    res.json({ user: user, token: auth });
  })
);

// Logout
authRouter.delete(
  '/',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    console.log('DELETE /api/auth - Logout endpoint reached');
    await clearAuth(req);
    console.log('User logged out');
    res.json({ message: 'logout successful' });
  })
);

// Update User
authRouter.put(
  '/:userId',
  authRouter.authenticateToken,
  asyncHandler(async (req, res) => {
    console.log('PUT /api/auth/:userId - Update user endpoint reached');
    const { email, password } = req.body;
    const userId = Number(req.params.userId);
    const user = req.user;
    console.log('Request details:', { userId, email, password, requestingUser: user });
    if (user.id !== userId && !user.isRole(Role.Admin)) {
      console.log('User not authorized to update this ID, returning 403');
      return res.status(403).json({ message: 'unauthorized' });
    }

    const updatedUser = await DB.updateUser(userId, email, password);
    console.log('User updated:', updatedUser);
    res.json(updatedUser);
  })
);

async function setAuth(user) {
  console.log('Entering setAuth for user:', user);
  const token = jwt.sign(user, config.jwtSecret);
  console.log('JWT signed:', token);
  await DB.loginUser(user.id, token);
  console.log('User logged in DB with token');
  return token;
}

async function clearAuth(req) {
  console.log('Entering clearAuth');
  const token = readAuthToken(req);
  if (token) {
    console.log('Token to clear:', token);
    await DB.logoutUser(token);
    console.log('Token cleared from DB');
  } else {
    console.log('No token to clear');
  }
}

function readAuthToken(req) {
  console.log('Entering readAuthToken');
  const authHeader = req.headers.authorization;
  console.log('Authorization header:', authHeader);
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    console.log('Extracted token:', token);
    return token;
  }
  console.log('No authorization header found');
  return null;
}

module.exports = { authRouter, setAuthUser };
