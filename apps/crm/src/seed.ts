import { db } from './db';
import { customers, orders } from './db/schema';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

const FIRST_NAMES = ['Aarav','Priya','Rahul','Sneha','Arjun','Kavya','Rohan','Meera','Vivek','Ananya','Siddharth','Nisha','Karan','Pooja','Aditya','Riya','Vikram','Swati','Amit','Deepika','Harsh','Preeti','Nikhil','Shruti','Gaurav','Isha','Rajesh','Simran','Manish','Pallavi'];
const LAST_NAMES = ['Sharma','Patel','Kumar','Singh','Gupta','Joshi','Mehta','Verma','Nair','Reddy','Rao','Iyer','Menon','Pillai','Bose','Das','Saxena','Malhotra','Kapoor','Bajaj'];
const CITIES = ['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Jaipur','Ahmedabad','Surat'];
const GENDERS = ['Male','Female','Female','Male','Female'];
const PRODUCTS = [['Dark Roast Blend','Filter Coffee Kit'],['Cold Brew Pack','Pour Over Set'],['Espresso Beans','Moka Pot'],['Single Origin Ethiopia','Coffee Grinder'],['Instant Specialty Coffee','Travel Mug'],['Green Coffee Beans','French Press'],['Decaf Blend','Milk Frother'],['Monsoon Malabar','Coffee Sampler Box']];

function rand(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function randDate(daysAgo: number) { return new Date(Date.now() - Math.random() * daysAgo * 86400000); }
function pick<T>(arr: T[]) { return arr[rand(0, arr.length - 1)]; }

export async function seedCustomers() {
  const [{ count }] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM customers`)).rows as any[];
  if (count > 0) return { message: `Already seeded. ${count} customers exist.`, count };

  const custData = Array.from({ length: 200 }, (_, i) => {
    const fn = pick(FIRST_NAMES), ln = pick(LAST_NAMES);
    return {
      id: createId(), name: `${fn} ${ln}`, email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@example.com`,
      phone: `+91${rand(7000000000, 9999999999)}`, city: pick(CITIES), gender: pick(GENDERS),
      signupDate: randDate(365), createdAt: new Date(), updatedAt: new Date(),
    };
  });
  await db.insert(customers).values(custData);

  const orderData: any[] = [];
  for (const c of custData) {
    const r = Math.random();
    const orderCount = r < 0.15 ? rand(8,15) : r < 0.35 ? rand(1,4) : r < 0.55 ? rand(1,2) : rand(2,6);
    const isInactive = r >= 0.15 && r < 0.35;
    for (let j = 0; j < orderCount; j++) {
      const daysAgo = isInactive && j === orderCount-1 ? rand(90,300) : rand(1, r < 0.15 ? 30 : r < 0.55 ? 30 : 60);
      orderData.push({ id: createId(), customerId: c.id, orderAmount: rand(350,4500), orderDate: randDate(daysAgo), products: pick(PRODUCTS), createdAt: new Date() });
    }
  }

  // Insert in chunks
  for (let i = 0; i < orderData.length; i += 100) {
    await db.insert(orders).values(orderData.slice(i, i+100));
  }

  return { message: `Seeded ${custData.length} customers and ${orderData.length} orders`, count: custData.length, orderCount: orderData.length };
}

if (require.main === module) {
  seedCustomers().then(console.log).catch(console.error).finally(() => process.exit(0));
}
