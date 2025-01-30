const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let registerRes;
let loginRes;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 5); // 5 minutes
}

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  testUserAuthToken = loginRes.body.token;
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('logout', async () => {
  const logoutRes = (await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`));
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toMatch('logout successful');
});

test('register a new user', async () => {
  const newName = randomName();
  const newUser = { name: newName, email: newName + '@test.com', password: 'a' };
  const registerRes2 = await request(app).post('/api/auth').send(newUser);
  expect(registerRes2.status).toBe(200);
  expectValidJwt(registerRes2.body.token);

  const expectedUser = { ...newUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  //password is not returned in the response
  expect(registerRes2.body.user).toMatchObject(expectedUser);
});

test('login user that does not exist', async () =>{
  const badUser = {name: 'baddie', email: 'baddie@doesnotexist.com', password: 'bad'};
  const loginRes = await request(app).put('/api/auth').send(badUser);
  expect(loginRes.status).toBe(404);
  expect(loginRes.body.message).toMatch('unknown user');
});


test('admin login', async () => {
  const adminUser = await createAdminUser();
  //const registerRes = await request(app).put('/api/auth').send(adminUser);
  const loginRes = (await request(app).put('/api/auth').send(adminUser));
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
  const expectedUser = { ...adminUser, roles: [{ role: 'admin' }] };
  delete expectedUser.password;
  //password is not returned in the response
  expect(loginRes.body.user).toMatchObject(expectedUser);

});

test('admin login with bad password', async () => {
  const adminUser = await createAdminUser();
  adminUser.password = 'badpassword';
  const loginRes = await request(app).put('/api/auth').send(adminUser);
  expect(loginRes.status).toBe(404);
  expect(loginRes.body.message).toMatch('unknown user');
});


test('update user', async () => {
const loginRes = await request(app).put('/api/auth').send(testUser);
const authToken = loginRes.body.token; // Use this token instead of testUserAuthToken

const updateRes = await request(app).put(`/api/auth/${loginRes.body.user.id}`).set('Authorization', `Bearer ${authToken}`).send({email: "new@gmail", password: "newpass"});

expect(updateRes.status).toBe(200);
expect(updateRes.body.email).toBe("new@gmail"); // Use toBe instead of toMatchObject for a single string
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