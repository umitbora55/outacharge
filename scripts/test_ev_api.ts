import dotenv from 'dotenv';
dotenv.config();

const API_KEY = 'Bw0EQIkz14vmptJGliGWBUic8rFQNkPctFCfiI3O';

async function testAPI() {
  console.log('Testing API Ninjas Electric Vehicle API...\n');
  
  try {
    // Test 1: Tesla Model 3
    console.log('Fetching Tesla Model 3...');
    const response = await fetch('https://api.api-ninjas.com/v1/electricvehicle?make=Tesla&model=Model%203', {
      headers: { 'X-Api-Key': API_KEY }
    });
    
    const data = await response.json();
    console.log('Found:', data.length, 'variants');
    console.log('Sample:', JSON.stringify(data[0], null, 2));
    
    // Test 2: Get all makes
    console.log('\n\nFetching all EV makes...');
    const makesResponse = await fetch('https://api.api-ninjas.com/v1/electricvehiclemakes', {
      headers: { 'X-Api-Key': API_KEY }
    });
    
    const makes = await makesResponse.json();
    console.log('Total makes:', makes.length);
    console.log('Sample makes:', makes.slice(0, 10));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI();
