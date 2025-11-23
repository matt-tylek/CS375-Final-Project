CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    shared_pet JSONB,
    delivered BOOLEAN NOT NULL DEFAULT FALSE,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_parties_created_idx ON messages (sender_id, recipient_id, created_at);
CREATE INDEX IF NOT EXISTS messages_recipient_created_idx ON messages (recipient_id, created_at);

CREATE TABLE IF NOT EXISTS wishlist_items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id TEXT NOT NULL,
    pet JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, pet_id)
);

CREATE TABLE IF NOT EXISTS starred_animals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id TEXT NOT NULL,
    pet JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, pet_id)
);

CREATE TABLE IF NOT EXISTS user_pet_listings (
    id SERIAL PRIMARY KEY, 
    --user_id INT NOT NULL,
    
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    species VARCHAR(50) NOT NULL,      

    primary_breed VARCHAR(100),
    secondary_breed VARCHAR(100),
    mixed_breed BOOLEAN DEFAULT FALSE NOT NULL,
    
    age VARCHAR(50) NOT NULL,     
    gender VARCHAR(10) NOT NULL,  
    size VARCHAR(50),            
    coat VARCHAR(50),
    description TEXT,
    
    is_spayed_neutered BOOLEAN DEFAULT FALSE NOT NULL,
    is_house_trained BOOLEAN DEFAULT FALSE NOT NULL,
    is_declawed BOOLEAN DEFAULT FALSE NOT NULL,
    is_special_needs BOOLEAN DEFAULT FALSE NOT NULL,
    is_shots_current BOOLEAN DEFAULT FALSE NOT NULL,

    good_with_children BOOLEAN,   
    good_with_dogs BOOLEAN,       
    good_with_cats BOOLEAN,       
    
    city VARCHAR(100) NOT NULL,
    state_code VARCHAR(2) NOT NULL,
    zipcode VARCHAR(10) NOT NULL, 
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    
    primary_photo_url VARCHAR(500), 
    status VARCHAR(50) DEFAULT 'adoptable',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    
    -- CONSTRAINT fk_user
    --     FOREIGN KEY (user_id)
    --     REFERENCES users(id)
    --     ON DELETE CASCADE
);