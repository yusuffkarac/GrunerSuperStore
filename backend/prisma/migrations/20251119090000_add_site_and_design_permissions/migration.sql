-- Add site and design settings permissions
INSERT INTO "public"."admin_permissions" ("id", "name", "display_name", "description", "category")
SELECT gen_random_uuid(), 'site_settings_manage', 'Seiteneinstellungen verwalten', 'Berechtigung zum Verwalten der Startseite, Footer, Cookie-Einstellungen und FAQs', 'settings'
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."admin_permissions" WHERE "name" = 'site_settings_manage'
);

INSERT INTO "public"."admin_permissions" ("id", "name", "display_name", "description", "category")
SELECT gen_random_uuid(), 'design_settings_manage', 'Design-Einstellungen verwalten', 'Berechtigung zum Verwalten der Design- und Markenrichtlinien (Farben, Logo, Favicon)', 'settings'
WHERE NOT EXISTS (
  SELECT 1 FROM "public"."admin_permissions" WHERE "name" = 'design_settings_manage'
);

