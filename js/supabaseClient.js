import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const supabaseUrl = 'https://ecgujuutpxebpjwdwhcy.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ3VqdXV0cHhlYnBqd2R3aGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMDk5MjUsImV4cCI6MjA4MzU4NTkyNX0.oLTY0FHaDVIQUFQqZYPunh4yn3JpGGRHoxW_NXaYNgE';
export const roleKey =     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjZ3VqdXV0cHhlYnBqd2R3aGN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAwOTkyNSwiZXhwIjoyMDgzNTg1OTI1fQ.p7Y6IlBkVZzCs94bDyGFVmvLhSYsdMqDEKEKZYN5bDQ';                          
export const FUNCTIONS = {
  getConfig: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/get-config',
  newsletter: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/newsletter',
  getProducts: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/get-products',
  getCategories: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/get-categories',
  promotions : 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/promotions',
  updateProduct: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/update-product',
  deleteProduct: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/delete-product',
  updateCategory: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/update-category',
  deleteCategory: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/delete-category',
  createCategory: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/create-category',
  reviews : 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/reviews',
  createProduct : 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/create-product' ,
  updatePromotion: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/update-promotion',
  deletePromotion: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/delete-promotion',
  upload: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/upload',
  updateConfig: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/update-config',
  createOrder: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/create-order',
  getLoyalty: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/get-loyalty',
  updateOrderStatus: 'https://ecgujuutpxebpjwdwhcy.supabase.co/functions/v1/update-order-status',
  // ajoute ici toutes tes fonctions
};

export const supabase = createClient(supabaseUrl, supabaseKey);
