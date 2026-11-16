-- 026: Optional — clear auto-seeded POS products (use empty catalog + UI add)

delete from public.pos_products
where name in ('Share / contribution', 'Product sale', 'Service fee', 'Miscellaneous');