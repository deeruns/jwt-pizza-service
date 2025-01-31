const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testUserAuthToken;
let adminAuthToken;
let adminUser;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
  //register new user and set the auth
  const testUser = { name: randomName(), email: randomName() + '@test.com', password: 'testpassword' };
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
  //register new admin and set auth
  adminUser = await createAdminUser();
  const adminLoginRes = await request(app).put('/api/auth').send(adminUser);
  adminAuthToken = adminLoginRes.body.token;
  expectValidJwt(adminAuthToken);
});

test('list all franchises', async () => {
  const response = await request(app).get('/api/franchise');
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test('list user franchises', async () => {
  const response = await request(app).get('/api/franchise/1').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(response.status).toBe(200);
  expect(Array.isArray(response.body)).toBe(true);
});

test('create a new franchise', async () => {
  //console.log(adminUser);
  const newFranchise = { name: 'New Pizza Franchise', admins: [{ email: adminUser.email }] };
  const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);
  expect(createRes.status).toBe(200);
  expect(createRes.body).toHaveProperty('id');
  expect(createRes.body.name).toBe(newFranchise.name);
  //delete the franchise so i can re-use the same name in the database
  const response = await request(app).delete(`/api/franchise/${createRes.body.id}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(response.status).toBe(200);
});

test('delete a franchise', async () => {
  //create a franchise to delete
  const newFranchise = { name: 'Delete Franchise', admins: [{ email: adminUser.email }] };
  const createRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);
  //delete with admin auth
  const response = await request(app).delete(`/api/franchise/${createRes.body.id}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(response.status).toBe(200);
  expect(response.body.message).toBe('franchise deleted');
});

test('create a new store and then delete it', async () => {
  // First, create a franchise
  const newFranchise = { name: 'Deez new Franchise', admins: [{ email: adminUser.email }] };
  const franchiseRes = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);

  const newStore = { name: 'Deez new Pizza Store' };
  const createRes = await request(app).post(`/api/franchise/${franchiseRes.body.id}/store`).set('Authorization', `Bearer ${adminAuthToken}`).send(newStore);
  expect(createRes.status).toBe(200);
  expect(createRes.body).toHaveProperty('id');
  expect(createRes.body.name).toBe(newStore.name);
  //delete the store so i can re-use the same name in the database
  const deleteRes = await request(app).delete(`/api/franchise/${franchiseRes.body.id}/store/${createRes.body.id}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(deleteRes.status).toBe(200);
  //delete Franchise also
  const response = await request(app).delete(`/api/franchise/${franchiseRes.body.id}`).set('Authorization', `Bearer ${adminAuthToken}`);
  expect(response.status).toBe(200);
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}
