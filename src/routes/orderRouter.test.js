const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testUserAuthToken;
let adminAuthToken;
let adminUser;
//let testUser;

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

test("get pizza menu", async () => {
  const menuRes = await request(app).get('/api/order/menu');
  expect(menuRes.status).toBe(200);
  //expect(Array.isArray(response.body)).toBe(true);
  expect(menuRes.body[1]).toHaveProperty('price');
});

test("Add an item to the menu, then delete it", async () => {
const newPizza = {title: "Student", description: "No topping, no sauce, just carbs", image:"pizza9.png", price: 0.0001 };
  //const menuItem = {title: "the deez special", description: "pep, mozz, deep dish, with special hot honey", image: "deePizza.png", price: 10.89}
  //const newwePizza = {title: 'Pepperoni', image:'pizza2.png', price: 0.023, description: 'Spicy treat'};
  const AddMenuRes = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminAuthToken}`).send(newPizza);

  expect(AddMenuRes.status).toBe(200);
  expect(AddMenuRes.body[13].title).toBe("Student");
});

test("create an order", async () => {
  const createOrderRes = await request(app).post('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`).send({franchiseId: 1, storeId: 1, items:[{menuId: 1, description: "Veggie", price: 0.05}]});
  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body).toHaveProperty('order');
});

test("get an order", async () => {
  const getOrderRes = await request(app).get('/api/order').set('Authorization', `Bearer ${testUserAuthToken}`);
  expect(getOrderRes.status).toBe(200);
  expect(getOrderRes.body).toHaveProperty("dinerId");
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