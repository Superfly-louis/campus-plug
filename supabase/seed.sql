-- Marketplace categories. Slugs match the categories_slug_format check.
insert into public.categories (name, slug, sort_order)
values
  ('Food & Snacks', 'food-and-snacks', 0),
  ('Fashion', 'fashion', 1),
  ('Electronics & Gadgets', 'electronics-and-gadgets', 2),
  ('Books & Stationery', 'books-and-stationery', 3),
  ('Beauty & Personal Care', 'beauty-and-personal-care', 4),
  ('Services', 'services', 5),
  ('Room Essentials', 'room-essentials', 6),
  ('Other', 'other', 7)
on conflict (slug) do nothing;
