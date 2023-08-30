DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  created_at DATE DEFAULT CURRENT_DATE
);

DROP TABLE IF EXISTS decks;

CREATE TABLE decks (
    id SERIAL PRIMARY KEY,
  name VARCHAR(40) NOT NULL UNIQUE,
  created_at DATE DEFAULT CURRENT_DATE
);

DROP TABLE IF EXISTS cards;

CREATE TABLE cards (
  id SERIAL PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  answer VARCHAR(255) NOT NULL,
  deck_id SERIAL,
  created_at DATE DEFAULT CURRENT_DATE,
  FOREIGN KEY (deck_id) REFERENCES decks(id)
);

DROP TABLE IF EXISTS streaks;

CREATE TABLE streaks (
    user_id SERIAL,
  card_id SERIAL,
  streak INTEGER NOT NULL,
  next_review_date DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (card_id) REFERENCES cards(id),
  PRIMARY KEY (user_id, card_id)
);
