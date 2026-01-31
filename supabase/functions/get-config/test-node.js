import fetch from 'node-fetch'; // si Node <18

const URL = 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/get-config';
const APIKEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ3VqdXV0cHhlYnBqd2R3aGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDk5MjUsImV4cCI6MjA4MzU4NTkyNX0.oLTY0FHaDVIQUFQqZYPunh4yn3JpGGRHoxW_NXaYNgE';

async function testGetConfig() {
  const res = await fetch(URL, {
    method: 'GET',
    headers: {
      apikey: APIKEY,
      'Content-Type': 'application/json',
    },
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.json());
}

testGetConfig();


