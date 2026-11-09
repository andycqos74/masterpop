-- "Years out": guess minus correct year for the game's year question.
-- Negative = guessed earlier than the correct year (guess 1970, answer 1974 -> -4).
ALTER TABLE games ADD COLUMN years_out integer;
