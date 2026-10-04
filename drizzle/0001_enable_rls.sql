-- Supabase stellt Tabellen im public-Schema über die REST-API (PostgREST) bereit.
-- RLS ohne Policies sperrt diesen Zugriff; die App verbindet sich als Tabellenbesitzer
-- und ist davon nicht betroffen. Auf einer normalen Postgres-Instanz wirkungslos.
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "participants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "round_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rounds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "submissions" ENABLE ROW LEVEL SECURITY;
