-- =============================================================================
-- Supabase Local Seed File: Test Users & Sample Numismatic Data
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- -----------------------------------------------------------------------------
-- 1. Test User Account (Password: password123)
-- -----------------------------------------------------------------------------

-- Account: test@example.com (ID: 00000000-0000-0000-0000-000000000001)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'test@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Test Collector"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = extensions.crypt('password123', extensions.gen_salt('bf')),
  email_confirmed_at = now();

INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"test@example.com"}'::jsonb,
  'email',
  'test@example.com',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 2. Storage Units
-- -----------------------------------------------------------------------------
INSERT INTO public.storageunits (storageunitid, name, description) VALUES
  (1, 'Main Album', 'Primary leather-bound currency binder'),
  (2, 'Safe Deposit Box', 'High-value notes stored in safe deposit'),
  (3, 'Display Frame', 'Wall-mounted UV protection acrylic frame')
ON CONFLICT (storageunitid) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

SELECT setval('public.storageunits_storageunitid_seq', (SELECT MAX(storageunitid) FROM public.storageunits));


-- -----------------------------------------------------------------------------
-- 3. Countries & Currencies
-- -----------------------------------------------------------------------------
INSERT INTO public.countries (countryid, code, name, continentid) VALUES
  (1, 'CAN', 'Canada', 1),
  (2, 'USA', 'United States', 1),
  (3, 'FRA', 'France', 2),
  (4, 'JPN', 'Japan', 3),
  (5, 'CHE', 'Switzerland', 2),
  (6, 'GBR', 'United Kingdom', 2)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

SELECT setval('public.countries_countryid_seq', (SELECT MAX(countryid) FROM public.countries));

INSERT INTO public.currencies (currencyid, name, code, symbol, subunit, numistaid) VALUES
  (1, 'Canadian Dollar', 'CAD', '$', 'Cent', 201),
  (2, 'United States Dollar', 'USD', '$', 'Cent', 202),
  (3, 'Euro', 'EUR', '€', 'Cent', 203),
  (4, 'Japanese Yen', 'JPY', '¥', 'Sen', 204),
  (5, 'Swiss Franc', 'CHF', 'CHF', 'Rappen', 205),
  (6, 'British Pound Sterling', 'GBP', '£', 'Penny', 206)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, symbol = EXCLUDED.symbol;

SELECT setval('public.currencies_currencyid_seq', (SELECT MAX(currencyid) FROM public.currencies));

INSERT INTO public.currencycountry (currencyid, countryid, iscurrent) VALUES
  (1, 1, true),
  (2, 2, true),
  (3, 3, true),
  (4, 4, true),
  (5, 5, true),
  (6, 6, true)
ON CONFLICT (currencyid, countryid) DO NOTHING;


-- -----------------------------------------------------------------------------
-- 4. Sample Banknotes (All assigned to test@example.com)
-- Images sourced from Numista (real photographed banknote scans, CC-licensed
-- member contributions). Codes are randomly generated 8-character identifiers.
-- -----------------------------------------------------------------------------
INSERT INTO public.banknotes (
  banknoteid, code, denomination, currencyid, year, width, height, material,
  storageunitid, numistaid, grade, front_thumbnail, back_thumbnail, front_image,
  back_image, description, ownerid, added_on
) VALUES
  (1, '4X9K2M7Q', 10.00, 1, 2018, 152.40, 69.85, 'Polymer', 1, 301, 'UNC',
   'https://en.numista.com/catalogue/photos/canada/64880efecc2285.61356140-180.jpg',
   'https://en.numista.com/catalogue/photos/canada/64880effc527f2.89038269-180.jpg',
   'https://en.numista.com/catalogue/photos/canada/64880efecc2285.61356140-original.jpg',
   'https://en.numista.com/catalogue/photos/canada/64880effc527f2.89038269-original.jpg',
   'Canada 10 Dollars 2018 Vertical Viola Desmond banknote.',
   '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '10 days'),

  (2, 'B8H3N5WZ', 100.00, 2, 2017, 156.00, 66.30, 'Paper', 2, 302, 'UNC',
   'https://en.numista.com/catalogue/photos/etats-unis/5e94e607288ee9.51006634-180.jpg',
   'https://en.numista.com/catalogue/photos/etats-unis/5e94e6079ff282.92400620-180.jpg',
   'https://en.numista.com/catalogue/photos/etats-unis/5e94e607288ee9.51006634-original.jpg',
   'https://en.numista.com/catalogue/photos/etats-unis/5e94e6079ff282.92400620-original.jpg',
   'US 100 Dollars Series 2017A Benjamin Franklin note.',
   '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '5 days'),

  (3, 'T2R9K4YL', 50.00, 3, 2017, 140.00, 77.00, 'Cotton Paper', 1, 303, 'XF',
   'https://en.numista.com/catalogue/photos/zone_euro/6870cdc3a6a826.72264288-180.jpg',
   'https://en.numista.com/catalogue/photos/zone_euro/6870cdc4010745.95660819-180.jpg',
   'https://en.numista.com/catalogue/photos/zone_euro/6870cdc3a6a826.72264288-original.jpg',
   'https://en.numista.com/catalogue/photos/zone_euro/6870cdc4010745.95660819-original.jpg',
   'Europa series 50 Euro banknote featuring Renaissance architecture.',
   '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days'),

  (4, 'P7M1X6QD', 1000.00, 4, 2004, 150.00, 76.00, 'Paper', 1, 304, 'AU',
   'https://en.numista.com/catalogue/photos/japon/6303a7960f6bd3.06205783-180.jpg',
   'https://en.numista.com/catalogue/photos/japon/6303a796aed512.23058092-180.jpg',
   'https://en.numista.com/catalogue/photos/japon/6303a7960f6bd3.06205783-original.jpg',
   'https://en.numista.com/catalogue/photos/japon/6303a796aed512.23058092-original.jpg',
   '1000 Yen featuring Hideyo Noguchi and Mount Fuji.',
   '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '12 days'),

  (5, 'N4W8K2ZR', 20.00, 5, 2017, 130.00, 70.00, 'Polymer substrate', 3, 305, 'UNC',
   'https://en.numista.com/catalogue/photos/suisse/5f4cfb666b4aa3.95359504-180.jpg',
   'https://en.numista.com/catalogue/photos/suisse/5f4cfb66cfc1a7.34299684-180.jpg',
   'https://en.numista.com/catalogue/photos/suisse/5f4cfb666b4aa3.95359504-original.jpg',
   'https://en.numista.com/catalogue/photos/suisse/5f4cfb66cfc1a7.34299684-original.jpg',
   'Swiss 20 Francs note representing light and cinema.',
   '00000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 day')

ON CONFLICT (banknoteid) DO UPDATE SET
  code = EXCLUDED.code,
  denomination = EXCLUDED.denomination,
  ownerid = EXCLUDED.ownerid,
  description = EXCLUDED.description;

SELECT setval('public.banknotes_banknoteid_seq', (SELECT MAX(banknoteid) FROM public.banknotes));