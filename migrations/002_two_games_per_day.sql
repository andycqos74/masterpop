-- Two Popmaster games per day: add a slot (1 or 2) to each game.
ALTER TABLE games ADD COLUMN slot smallint NOT NULL DEFAULT 1 CHECK (slot IN (1, 2));
ALTER TABLE games DROP CONSTRAINT games_user_id_played_on_key;
ALTER TABLE games ADD CONSTRAINT games_user_day_slot_key UNIQUE (user_id, played_on, slot);
