CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  display_name  text NOT NULL,
  password_hash text NOT NULL,
  is_admin      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE invites (
  code       text PRIMARY KEY,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  used_by    uuid REFERENCES users(id) ON DELETE SET NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE games (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  played_on  date NOT NULL,
  total      integer NOT NULL CHECK (total >= 0),
  notes      text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, played_on)
);
CREATE INDEX games_date_idx ON games(played_on);

CREATE TABLE game_rounds (
  game_id   uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  round_key text NOT NULL,
  points    integer NOT NULL CHECK (points >= 0),
  PRIMARY KEY (game_id, round_key)
);
